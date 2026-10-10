import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangeRoleStatusDto } from './dto/change-role-status.dto.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { ListRolesDto } from './dto/list-roles.dto.js';
import type { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';

const roleSummarySelection = {
  id: true,
  name: true,
  code: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true, permissions: true } },
} as const;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    try {
      return await this.prisma.role.create({
        data: {
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          description: dto.description?.trim() || null,
        },
        select: roleSummarySelection,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async findAll(query: ListRolesDto) {
    const search = query.search?.trim();
    const where: Prisma.RoleWhereInput = {
      isActive: query.isActive,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        select: roleSummarySelection,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.role.count({ where }),
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
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: {
        ...roleSummarySelection,
        permissions: {
          select: {
            menuId: true,
            actionId: true,
            menu: {
              select: {
                code: true,
                name: true,
                module: { select: { id: true, code: true, name: true } },
              },
            },
            action: { select: { code: true, name: true } },
          },
          orderBy: [{ menuId: 'asc' }, { actionId: 'asc' }],
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: number, dto: UpdateRoleDto) {
    await this.ensureRoleExists(id);
    try {
      return await this.prisma.role.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim().toUpperCase(),
          description:
            dto.description === undefined
              ? undefined
              : dto.description.trim() || null,
        },
        select: roleSummarySelection,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async changeStatus(id: number, dto: ChangeRoleStatusDto) {
    await this.ensureRoleExists(id);
    return this.prisma.role.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: roleSummarySelection,
    });
  }

  async updatePermissions(id: number, dto: UpdateRolePermissionsDto) {
    await this.ensureRoleExists(id);
    await this.validatePermissions(dto.permissions);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.roleMenuAction.deleteMany({ where: { roleId: id } });
      if (dto.permissions.length > 0) {
        await transaction.roleMenuAction.createMany({
          data: dto.permissions.map(({ menuId, actionId }) => ({
            roleId: id,
            menuId,
            actionId,
          })),
        });
      }
    });

    return this.findOne(id);
  }

  async getPermissionCatalog() {
    const [modules, actions] = await this.prisma.$transaction([
      this.prisma.module.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          icon: true,
          sortOrder: true,
          menus: {
            where: { isActive: true },
            select: {
              id: true,
              parentId: true,
              code: true,
              name: true,
              route: true,
              icon: true,
              sortOrder: true,
              isVisible: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.action.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true, description: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    ]);
    return { modules, actions };
  }

  private async validatePermissions(
    permissions: UpdateRolePermissionsDto['permissions'],
  ): Promise<void> {
    if (permissions.length === 0) return;
    const menuIds = [...new Set(permissions.map(({ menuId }) => menuId))];
    const actionIds = [...new Set(permissions.map(({ actionId }) => actionId))];
    const [menuCount, actionCount] = await this.prisma.$transaction([
      this.prisma.menu.count({
        where: {
          id: { in: menuIds },
          isActive: true,
          module: { isActive: true },
        },
      }),
      this.prisma.action.count({
        where: { id: { in: actionIds }, isActive: true },
      }),
    ]);
    if (menuCount !== menuIds.length || actionCount !== actionIds.length) {
      throw new BadRequestException(
        'Every permission must reference an active menu and action',
      );
    }
  }

  private async ensureRoleExists(id: number): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!role) throw new NotFoundException('Role not found');
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Role name or code is already in use');
    }
  }
}
