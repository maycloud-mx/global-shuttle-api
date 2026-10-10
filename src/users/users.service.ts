import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    await this.ensureActiveRole(dto.roleId);

    try {
      return await this.prisma.user.create({
        data: {
          roleId: dto.roleId,
          email: dto.email.trim().toLowerCase(),
          username: dto.username.trim(),
          passwordHash: await hash(dto.password, 12),
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
        },
        select: userSelection,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

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

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelection,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.ensureUserExists(id);
    if (dto.roleId !== undefined) await this.ensureActiveRole(dto.roleId);

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          roleId: dto.roleId,
          email: dto.email?.trim().toLowerCase(),
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

  async changeStatus(id: number, dto: ChangeUserStatusDto) {
    await this.ensureUserExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: userSelection,
    });
  }

  private async ensureUserExists(id: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
  }

  private async ensureActiveRole(roleId: number): Promise<void> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, isActive: true },
      select: { id: true },
    });
    if (!role) throw new NotFoundException('Active role not found');
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
