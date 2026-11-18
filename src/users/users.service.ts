import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { Prisma, UserTokenType } from '../generated/prisma/index.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { AuthTokenService } from '../auth/services/auth-token.service.js';
import { EmailService } from '../email/email.service.js';

import {
  renderAccountActivationEmail,
  renderAccountActivationText,
} from '../email/views/auth/account-activation.template.js';

import type { ChangeUserStatusDto } from './dto/change-user-status.dto.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { ListUsersDto } from './dto/list-users.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

// =========================================================
// CONFIGURATION
// =========================================================

const INVITATION_COOLDOWN_SECONDS = 60;
const MAX_INVITATIONS_PER_DAY = 5;
const INVITATION_WINDOW_HOURS = 24;

type InvitationStatus =
  'ACTIVE' | 'INACTIVE' | 'PENDING' | 'EXPIRED' | 'NOT_SENT';

// =========================================================
// USER SELECTION
// =========================================================

const userSelection = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  isActive: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,

  role: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  },

  tokens: {
    where: {
      type: UserTokenType.ACCOUNT_ACTIVATION,
    },
    select: {
      createdAt: true,
      expiresAt: true,
      usedAt: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 1,
  },
} satisfies Prisma.UserSelect;

type SelectedUser = Prisma.UserGetPayload<{
  select: typeof userSelection;
}>;

// =========================================================
// SERVICE
// =========================================================

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authTokenService: AuthTokenService,
    private readonly emailService: EmailService,
  ) {}

  // =========================================================
  // CREATE
  // =========================================================

  async create(dto: CreateUserDto) {
    await this.ensureActiveRole(dto.roleId);

    let user: SelectedUser;

    try {
      user = await this.prisma.user.create({
        data: {
          roleId: dto.roleId,
          email: dto.email.trim().toLowerCase(),
          username: dto.username.trim(),
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),

          passwordHash: null,
          emailVerifiedAt: null,
          authVersion: 0,
          isActive: true,
        },
        select: userSelection,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }

    // El usuario ya fue registrado.
    // Un fallo SMTP no debe eliminarlo.
    let invitationSent = false;

    try {
      await this.sendActivationInvitation(user);
      invitationSent = true;
    } catch (error) {
      this.logInvitationError(user.id, error, 'Initial activation invitation');
    }

    const updatedUser = await this.findUserOrThrow(user.id);

    return {
      ...this.toUserResponse(updatedUser),
      invitationSent,
    };
  }

  // =========================================================
  // LIST
  // =========================================================

  async findAll(query: ListUsersDto) {
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      isActive: query.isActive,
      roleId: query.roleId,
      ...(search
        ? {
            OR: [
              { email: { contains: search } },
              { username: { contains: search } },
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelection,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.limit,
      }),

      this.prisma.user.count({
        where,
      }),
    ]);

    return {
      items: users.map((user) => this.toUserResponse(user)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  // =========================================================
  // DETAIL
  // =========================================================

  async findOne(id: number) {
    const user = await this.findUserOrThrow(id);

    return this.toUserResponse(user);
  }

  // =========================================================
  // UPDATE
  // =========================================================

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (dto.roleId !== undefined) {
      await this.ensureActiveRole(dto.roleId);
    }

    const newEmail = dto.email?.trim().toLowerCase();

    // El cambio de correo requiere
    // un flujo de verificación separado.
    if (newEmail !== undefined && newEmail !== existing.email) {
      throw new BadRequestException(
        'Email changes require a separate verification process',
      );
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          roleId: dto.roleId,
          username: dto.username?.trim(),
          firstName: dto.firstName?.trim(),
          lastName: dto.lastName?.trim(),
        },
        select: userSelection,
      });

      return this.toUserResponse(user);
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  // =========================================================
  // CHANGE STATUS
  // =========================================================

  async changeStatus(id: number, dto: ChangeUserStatusDto) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundException('User not found');
      }

      await tx.user.update({
        where: { id },
        data: {
          isActive: dto.isActive,
        },
      });

      // Al desactivar la cuenta, invalidamos
      // invitaciones y recuperaciones pendientes.
      if (!dto.isActive) {
        await this.authTokenService.invalidate(
          id,
          UserTokenType.ACCOUNT_ACTIVATION,
          tx,
        );

        await this.authTokenService.invalidate(
          id,
          UserTokenType.PASSWORD_RESET,
          tx,
        );
      }
    });

    // Consultar después de confirmar
    // la transacción evita devolver tokens
    // y estados anteriores a la invalidación.
    const updatedUser = await this.findUserOrThrow(id);

    return this.toUserResponse(updatedUser);
  }

  // =========================================================
  // RESEND ACTIVATION INVITATION
  // =========================================================

  async resendInvitation(id: number) {
    const user = await this.findUserOrThrow(id);

    this.ensureCanReceiveInvitation(user);

    // Controlar frecuencia antes
    // de generar un token nuevo.
    await this.ensureInvitationLimit(id);

    let invitationSent = false;

    try {
      await this.sendActivationInvitation(user);
      invitationSent = true;
    } catch (error) {
      this.logInvitationError(user.id, error, 'Activation invitation resend');
    }

    const updatedUser = await this.findUserOrThrow(id);

    return {
      userId: updatedUser.id,
      email: updatedUser.email,
      invitationSent,
      invitationStatus: this.getInvitationStatus(updatedUser),
      message: invitationSent
        ? 'Activation invitation sent successfully'
        : 'Activation invitation could not be sent',
    };
  }

  // =========================================================
  // INVITATION VALIDATIONS
  // =========================================================

  private ensureCanReceiveInvitation(user: SelectedUser): void {
    if (!user.isActive) {
      throw new BadRequestException(
        'Cannot send invitations to inactive users',
      );
    }

    if (!user.role.isActive) {
      throw new BadRequestException(
        'Cannot send invitations to users with an inactive role',
      );
    }

    if (user.emailVerifiedAt !== null) {
      throw new BadRequestException('User account is already verified');
    }

    // AuthTokenService.generate()
    // realiza también la validación definitiva
    // de passwordHash y estado de la cuenta.
  }

  // =========================================================
  // INVITATION LIMITS
  // =========================================================

  private async ensureInvitationLimit(userId: number): Promise<void> {
    const now = new Date();

    const windowStart = new Date(
      now.getTime() - INVITATION_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const [lastInvitation, invitationCount] = await this.prisma.$transaction([
      this.prisma.userToken.findFirst({
        where: {
          userId,
          type: UserTokenType.ACCOUNT_ACTIVATION,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          createdAt: true,
        },
      }),

      this.prisma.userToken.count({
        where: {
          userId,
          type: UserTokenType.ACCOUNT_ACTIVATION,
          createdAt: {
            gte: windowStart,
          },
        },
      }),
    ]);

    if (lastInvitation) {
      const secondsSinceLast =
        (now.getTime() - lastInvitation.createdAt.getTime()) / 1000;

      if (secondsSinceLast < INVITATION_COOLDOWN_SECONDS) {
        throw new HttpException(
          'Please wait before requesting another invitation',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    if (invitationCount >= MAX_INVITATIONS_PER_DAY) {
      throw new HttpException(
        'Daily invitation limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // =========================================================
  // SEND ACTIVATION INVITATION
  // =========================================================

  private async sendActivationInvitation(user: {
    id: number;
    email: string;
    username: string;
    firstName: string;
  }): Promise<void> {
    // Validar URL antes de crear un token.
    const adminUrl = this.getAdminFrontendUrl();

    const { token, expiresAt } = await this.authTokenService.generate(
      user.id,
      UserTokenType.ACCOUNT_ACTIVATION,
    );

    const activationUrl = new URL('/activate-account', adminUrl);

    activationUrl.searchParams.set('token', token);

    const templateData = {
      firstName: user.firstName,
      username: user.username,
      activationUrl: activationUrl.toString(),
      expiresAt,
    };

    await this.emailService.sendEmail(
      user.email,
      'Active su cuenta de Global Shuttle Cancún',
      renderAccountActivationEmail(templateData),
      renderAccountActivationText(templateData),
    );
  }

  // =========================================================
  // INVITATION STATUS
  // =========================================================

  private getInvitationStatus(user: SelectedUser): InvitationStatus {
    if (!user.isActive || !user.role.isActive) {
      return 'INACTIVE';
    }

    if (user.emailVerifiedAt !== null) {
      return 'ACTIVE';
    }

    const latestToken = user.tokens[0];

    if (!latestToken) {
      return 'NOT_SENT';
    }

    if (latestToken.usedAt !== null) {
      return 'NOT_SENT';
    }

    if (latestToken.expiresAt.getTime() <= Date.now()) {
      return 'EXPIRED';
    }

    return 'PENDING';
  }

  // =========================================================
  // USER RESPONSE
  // =========================================================

  private toUserResponse(user: SelectedUser) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role,
      invitationStatus: this.getInvitationStatus(user),
    };
  }

  // =========================================================
  // ADMIN FRONTEND URL
  // =========================================================

  private getAdminFrontendUrl(): URL {
    const value = process.env.ADMIN_FRONTEND_URL;

    if (!value) {
      throw new ServiceUnavailableException(
        'Admin frontend URL is not configured',
      );
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new ServiceUnavailableException('Invalid admin frontend URL');
    }

    const isLocalhost = ['localhost', '127.0.0.1'].includes(url.hostname);

    if (
      url.protocol !== 'https:' &&
      !(isLocalhost && url.protocol === 'http:')
    ) {
      throw new ServiceUnavailableException(
        'Admin frontend URL must use HTTPS',
      );
    }

    if (url.username || url.password || url.search || url.hash) {
      throw new ServiceUnavailableException(
        'Invalid admin frontend URL configuration',
      );
    }

    return url;
  }

  // =========================================================
  // INTERNAL USER QUERY
  // =========================================================

  private async findUserOrThrow(id: number): Promise<SelectedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelection,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // =========================================================
  // ROLE VALIDATION
  // =========================================================

  private async ensureActiveRole(roleId: number): Promise<void> {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException('Active role not found');
    }
  }

  // =========================================================
  // UNIQUE CONSTRAINT
  // =========================================================

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email or username is already in use');
    }
  }

  // =========================================================
  // INVITATION ERROR LOG
  // =========================================================

  private logInvitationError(
    userId: number,
    error: unknown,
    operation: string,
  ): void {
    this.logger.error(
      `${operation} failed for user ID ${userId}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
