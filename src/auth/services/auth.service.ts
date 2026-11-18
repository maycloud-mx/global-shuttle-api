import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';

import { UserTokenType } from '../../generated/prisma/index.js';

import { PrismaService } from '../../prisma/prisma.service.js';
import { loadEnvironment } from '../../config/environment.js';

import { EmailService } from '../../email/email.service.js';
import { TurnstileService } from '../../security/turnstile/turnstile.service.js';

import { AuthTokenService } from './auth-token.service.js';

import {
  renderPasswordResetEmail,
  renderPasswordResetText,
} from '../../email/templates/auth/password-reset.template.js';

import {
  renderPasswordChangedEmail,
  renderPasswordChangedText,
} from '../../email/templates/auth/password-changed.template.js';

import type { LoginDto } from '../dto/login.dto.js';
import type { ForgotPasswordDto } from '../dto/forgot-password.dto.js';
import type { ResetPasswordDto } from '../dto/reset-password.dto.js';
import type { ChangePasswordDto } from '../dto/change-password.dto.js';
import type { CompleteAccountActivationDto } from '../dto/complete-account-activation.dto.js';

import type { AuthenticatedUser, AuthNavigationModule } from '../auth.types.js';

// =========================================================
// USER AUTHORIZATION SHAPE
// =========================================================

const userWithAuthorization = {
  role: {
    include: {
      permissions: {
        where: {
          menu: {
            isActive: true,
            module: { isActive: true },
          },
          action: { isActive: true },
        },
        include: {
          menu: {
            include: { module: true },
          },
          action: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly authTokenService: AuthTokenService,
    private readonly emailService: EmailService,
    private readonly turnstileService: TurnstileService,
  ) {}

  // =========================================================
  // LOGIN
  // =========================================================

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
      },
      include: userWithAuthorization,
    });

    if (
      !user ||
      !user.isActive ||
      !user.role.isActive ||
      !user.emailVerifiedAt ||
      !user.passwordHash ||
      !(await compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const config = loadEnvironment();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
        authVersion: user.authVersion,
      },
      {
        expiresIn: config.JWT_EXPIRES_IN_SECONDS,
      },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: config.JWT_EXPIRES_IN_SECONDS,
      user: this.toAuthenticatedUser(user),
    };
  }

  // =========================================================
  // AUTHENTICATED USER
  // =========================================================

  async findAuthenticatedUser(
    userId: number,
    authVersion: number,
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userWithAuthorization,
    });

    if (
      !user ||
      !user.isActive ||
      !user.role.isActive ||
      !user.emailVerifiedAt ||
      !user.passwordHash ||
      user.authVersion !== authVersion
    ) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    return this.toAuthenticatedUser(user);
  }

  // =========================================================
  // VALIDATE ACCOUNT ACTIVATION TOKEN
  // =========================================================

  async validateActivationToken(token: string) {
    const valid = await this.authTokenService.validate(
      token,
      UserTokenType.ACCOUNT_ACTIVATION,
    );

    return { valid };
  }

  // =========================================================
  // COMPLETE ACCOUNT ACTIVATION
  // =========================================================

  async completeAccountActivation(dto: CompleteAccountActivationDto) {
    const passwordHash = await hash(dto.password, 12);

    await this.prisma.$transaction(async (tx) => {
      // consume() bloquea la fila del usuario,
      // valida el token y lo marca como utilizado.
      const userId = await this.authTokenService.consume(
        tx,
        dto.token,
        UserTokenType.ACCOUNT_ACTIVATION,
      );

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          isActive: true,
          emailVerifiedAt: true,
          passwordHash: true,
          role: {
            select: {
              isActive: true,
            },
          },
        },
      });

      if (
        !user ||
        !user.isActive ||
        !user.role.isActive ||
        user.emailVerifiedAt !== null ||
        user.passwordHash !== null
      ) {
        throw new BadRequestException('Account cannot be activated');
      }

      const now = new Date();

      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          emailVerifiedAt: now,
          authVersion: { increment: 1 },
        },
      });

      // Invalida cualquier otra invitación
      // pendiente en la misma transacción.
      await tx.userToken.updateMany({
        where: {
          userId,
          type: UserTokenType.ACCOUNT_ACTIVATION,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      });
    });

    return {
      message: 'Account activated successfully',
    };
  }

  // =========================================================
  // VALIDATE PASSWORD RESET TOKEN
  // =========================================================

  /**
   * Comprueba que un enlace de recuperación
   * pueda utilizarse.
   *
   * No consume ni invalida el token.
   */
  async validatePasswordResetToken(token: string) {
    const valid = await this.authTokenService.validate(
      token,
      UserTokenType.PASSWORD_RESET,
    );

    return { valid };
  }

  // =========================================================
  // FORGOT PASSWORD
  // =========================================================

  async forgotPassword(dto: ForgotPasswordDto) {
    // Cloudflare Turnstile se valida antes
    // de consultar la base de datos.
    await this.turnstileService.verify(dto.turnstileToken, {
      expectedAction: 'password_reset',
    });

    // Respuesta genérica para evitar
    // enumeración de cuentas.
    const response = {
      message:
        'If an account exists for this email, password reset instructions will be sent',
    };

    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        isActive: true,
        emailVerifiedAt: true,
        passwordHash: true,
        role: {
          select: {
            isActive: true,
          },
        },
      },
    });

    // Solo usuarios confirmados y habilitados
    // pueden recuperar su contraseña.
    if (
      !user ||
      !user.isActive ||
      !user.role.isActive ||
      !user.emailVerifiedAt ||
      !user.passwordHash
    ) {
      return response;
    }

    try {
      const { token, expiresAt } = await this.authTokenService.generate(
        user.id,
        UserTokenType.PASSWORD_RESET,
      );

      const resetUrl = this.buildFrontendUrl('/reset-password', token);

      const templateData = {
        firstName: user.firstName,
        resetUrl,
        expiresAt,
      };

      await this.emailService.sendEmail(
        user.email,
        'Restablezca su contraseña de Global Shuttle Cancún',
        renderPasswordResetEmail(templateData),
        renderPasswordResetText(templateData),
      );
    } catch (error) {
      // No revelar si el usuario existe,
      // si falló SMTP o si hubo otro problema.
      this.logger.error(
        'Password reset email could not be processed',
        error instanceof Error ? error.stack : undefined,
      );
    }

    return response;
  }

  // =========================================================
  // RESET PASSWORD
  // =========================================================

  async resetPassword(dto: ResetPasswordDto) {
    const passwordHash = await hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      // consume() bloquea la fila del usuario
      // y garantiza el consumo único del token.
      const userId = await this.authTokenService.consume(
        tx,
        dto.token,
        UserTokenType.PASSWORD_RESET,
      );

      const existingUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          isActive: true,
          emailVerifiedAt: true,
          passwordHash: true,
          role: {
            select: {
              isActive: true,
            },
          },
        },
      });

      if (
        !existingUser ||
        !existingUser.isActive ||
        !existingUser.role.isActive ||
        !existingUser.emailVerifiedAt ||
        !existingUser.passwordHash
      ) {
        throw new BadRequestException('Password cannot be reset');
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          authVersion: { increment: 1 },
        },
      });

      // Invalidar los tokens de recuperación
      // restantes dentro de esta transacción.
      await this.authTokenService.invalidate(
        userId,
        UserTokenType.PASSWORD_RESET,
        tx,
      );

      return existingUser;
    });

    // El envío de correo ocurre después
    // de confirmar la transacción.
    await this.sendPasswordChangedNotification(user.email, user.firstName);

    return {
      message: 'Password reset successfully',
    };
  }

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        passwordHash: true,
        authVersion: true,
        isActive: true,
        emailVerifiedAt: true,
        role: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (
      !user ||
      !user.isActive ||
      !user.role.isActive ||
      !user.emailVerifiedAt ||
      !user.passwordHash
    ) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const passwordMatches = await compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const samePassword = await compare(dto.newPassword, user.passwordHash);

    if (samePassword) {
      throw new BadRequestException('New password must be different');
    }

    const newPasswordHash = await hash(dto.newPassword, 12);

    // Cambio de contraseña e invalidación
    // de tokens en una sola transacción.
    await this.prisma.$transaction(async (tx) => {
      // Actualización condicional para impedir
      // sobrescribir cambios simultáneos.
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          authVersion: user.authVersion,
          passwordHash: user.passwordHash,
          isActive: true,
          emailVerifiedAt: { not: null },
          role: {
            isActive: true,
          },
        },
        data: {
          passwordHash: newPasswordHash,
          authVersion: { increment: 1 },
        },
      });

      if (updated.count !== 1) {
        throw new UnauthorizedException('Session is no longer valid');
      }

      // invalidate() utilizará la misma
      // transacción de Prisma.
      await this.authTokenService.invalidate(
        userId,
        UserTokenType.PASSWORD_RESET,
        tx,
      );
    });

    // Si falla la notificación, no revertimos
    // el cambio de contraseña.
    await this.sendPasswordChangedNotification(user.email, user.firstName);

    return {
      message: 'Password changed successfully',
    };
  }

  // =========================================================
  // PASSWORD CHANGED NOTIFICATION
  // =========================================================

  private async sendPasswordChangedNotification(
    email: string,
    firstName: string,
  ): Promise<void> {
    const templateData = {
      firstName,
      changedAt: new Date(),
    };

    try {
      await this.emailService.sendEmail(
        email,
        'Su contraseña de Global Shuttle Cancún fue actualizada',
        renderPasswordChangedEmail(templateData),
        renderPasswordChangedText(templateData),
      );
    } catch (error) {
      // Una contraseña ya modificada no debe
      // revertirse por fallos de correo.
      this.logger.error(
        'Password change notification could not be sent',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // =========================================================
  // FRONTEND URL
  // =========================================================

  private buildFrontendUrl(pathname: string, token: string): string {
    const baseUrl = process.env.ADMIN_FRONTEND_URL;

    if (!baseUrl) {
      throw new Error('ADMIN_FRONTEND_URL is not configured');
    }

    const url = new URL(baseUrl);

    const isLocalhost = ['localhost', '127.0.0.1'].includes(url.hostname);

    if (
      (url.protocol !== 'https:' &&
        !(isLocalhost && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('Invalid ADMIN_FRONTEND_URL configuration');
    }

    const result = new URL(pathname, url);
    result.searchParams.set('token', token);

    return result.toString();
  }

  // =========================================================
  // AUTHENTICATED USER RESPONSE
  // =========================================================

  private toAuthenticatedUser(
    user: Awaited<ReturnType<AuthService['findUserShape']>>,
  ): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: {
        id: user.role.id,
        code: user.role.code,
        name: user.role.name,
      },
      permissions: user.role.permissions.map(({ menu, action }) => ({
        module: menu.module.code,
        menu: menu.code,
        action: action.code,
      })),
      navigation: this.buildNavigation(user.role.permissions),
    };
  }

  // =========================================================
  // BUILD NAVIGATION
  // =========================================================

  private buildNavigation(
    permissions: Awaited<
      ReturnType<AuthService['findUserShape']>
    >['role']['permissions'],
  ): AuthNavigationModule[] {
    const modules = new Map<number, AuthNavigationModule>();

    for (const { menu, action } of permissions) {
      if (!menu.isVisible) continue;

      let navigationModule = modules.get(menu.module.id);

      if (!navigationModule) {
        navigationModule = {
          id: menu.module.id,
          code: menu.module.code,
          name: menu.module.name,
          description: menu.module.description,
          icon: menu.module.icon,
          sortOrder: menu.module.sortOrder,
          menus: [],
        };

        modules.set(menu.module.id, navigationModule);
      }

      let navigationMenu = navigationModule.menus.find(
        ({ id }) => id === menu.id,
      );

      if (!navigationMenu) {
        navigationMenu = {
          id: menu.id,
          parentId: menu.parentId,
          code: menu.code,
          name: menu.name,
          route: menu.route,
          icon: menu.icon,
          sortOrder: menu.sortOrder,
          actions: [],
        };

        navigationModule.menus.push(navigationMenu);
      }

      navigationMenu.actions.push(action.code);
    }

    return [...modules.values()]
      .map((module) => ({
        ...module,
        menus: module.menus
          .map((menu) => ({
            ...menu,
            actions: menu.actions.sort((left, right) =>
              left.localeCompare(right),
            ),
          }))
          .sort(
            (left, right) =>
              left.sortOrder - right.sortOrder || left.id - right.id,
          ),
      }))
      .sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
      );
  }

  // =========================================================
  // INTERNAL USER SHAPE
  // =========================================================

  private async findUserShape(userId: number) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: userWithAuthorization,
    });
  }
}
