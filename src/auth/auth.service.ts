import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { loadEnvironment } from '../config/environment.js';
import type { LoginDto } from './dto/login.dto.js';
import type { AuthenticatedUser } from './auth.types.js';

const userWithAuthorization = {
  role: {
    include: {
      permissions: {
        where: {
          menu: { isActive: true },
          action: { isActive: true },
        },
        include: {
          menu: { include: { module: true } },
          action: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createDemoUser() {
    const config = loadEnvironment();
    if (config.NODE_ENV === 'production') {
      throw new NotFoundException('Resource not found');
    }

    const temporaryPassword = randomBytes(18).toString('base64url');
    const passwordHash = await hash(temporaryPassword, 12);
    const role = await this.prisma.role.upsert({
      where: { code: 'DEMO' },
      update: { isActive: true },
      create: {
        code: 'DEMO',
        name: 'Demo',
        description: 'Development-only login role',
      },
    });
    const user = await this.prisma.user.upsert({
      where: { email: 'demo@globalshuttle.local' },
      update: {
        roleId: role.id,
        username: 'demo',
        passwordHash,
        isActive: true,
      },
      create: {
        roleId: role.id,
        email: 'demo@globalshuttle.local',
        username: 'demo',
        passwordHash,
        firstName: 'Demo',
        lastName: 'User',
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    return {
      user,
      temporaryPassword,
      loginEndpoint: '/api/v1/auth/login',
    };
  }

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
      !(await compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const config = loadEnvironment();
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, username: user.username },
      { expiresIn: config.JWT_EXPIRES_IN_SECONDS },
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: config.JWT_EXPIRES_IN_SECONDS,
      user: this.toAuthenticatedUser(user),
    };
  }

  async findAuthenticatedUser(userId: number): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userWithAuthorization,
    });
    if (!user || !user.isActive || !user.role.isActive) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    return this.toAuthenticatedUser(user);
  }

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
    };
  }

  private async findUserShape(userId: number) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: userWithAuthorization,
    });
  }
}
