import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { loadEnvironment } from '../config/environment.js';
import type { LoginDto } from './dto/login.dto.js';
import type { AuthenticatedUser, AuthNavigationModule } from './auth.types.js';

const userWithAuthorization = {
  role: {
    include: {
      permissions: {
        where: {
          menu: { isActive: true, module: { isActive: true } },
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
      navigation: this.buildNavigation(user.role.permissions),
    };
  }

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

  private async findUserShape(userId: number) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: userWithAuthorization,
    });
  }
}
