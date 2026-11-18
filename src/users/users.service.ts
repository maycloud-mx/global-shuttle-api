import {
  BadRequestException,
  ConflictException,
  Injectable,
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
} from '../email/templates/auth/account-activation.template.js';

import type { ChangeUserStatusDto } from './dto/change-user-status.dto.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { ListUsersDto } from './dto/list-users.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

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
} as const;

@Injectable()
export class UsersService {
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

    let user;

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

    // El usuario ya está registrado.
    // Si falla el correo, podrá reenviarse la invitación.
    await this.sendActivationInvitation(user);

    return user;
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

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelection,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
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

    // El cambio de correo requiere su propio flujo
    // de verificación. No se modifica silenciosamente
    // una dirección ya registrada.
    if (newEmail !== undefined && newEmail !== existing.email) {
      throw new BadRequestException(
        'Email changes require a separate verification process',
      );
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          roleId: dto.roleId,
          username: dto.username?.trim(),
          firstName: dto.firstName?.trim(),
          lastName: dto.lastName?.trim(),
        },
        select: userSelection,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  // =========================================================
  // CHANGE STATUS
  // =========================================================

  async changeStatus(id: number, dto: ChangeUserStatusDto) {
    await this.ensureUserExists(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
      },
      select: userSelection,
    });
  }

  // =========================================================
  // RESEND ACTIVATION INVITATION
  // =========================================================

  async resendInvitation(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelection,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException(
        'Cannot send invitations to inactive users',
      );
    }

    if (user.emailVerifiedAt !== null) {
      throw new BadRequestException('User account is already verified');
    }

    await this.sendActivationInvitation(user);

    return {
      message: 'Activation invitation sent successfully',
      userId: user.id,
      email: user.email,
    };
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
  // VALIDATIONS
  // =========================================================

  private async ensureUserExists(id: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

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

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email or username is already in use');
    }
  }
}
