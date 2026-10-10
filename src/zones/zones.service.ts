import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangeZoneStatusDto } from './dto/change-zone-status.dto.js';
import type { CreateZoneDto } from './dto/create-zone.dto.js';
import type { ListZonesDto } from './dto/list-zones.dto.js';
import type { UpdateZoneDto } from './dto/update-zone.dto.js';

const creatorSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateZoneDto, createdById: number) {
    try {
      return await this.prisma.zone.create({
        data: {
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          description: dto.description?.trim(),
          isLocal: dto.isLocal,
          codeExternal: dto.codeExternal?.trim(),
          createdById,
        },
        include: { createdBy: { select: creatorSelect } },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async findAll(query: ListZonesDto) {
    const search = query.search?.trim();
    const where: Prisma.ZoneWhereInput = {
      status: query.status,
      isLocal: query.isLocal,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { codeExternal: { contains: search } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.zone.findMany({
        where,
        include: { createdBy: { select: creatorSelect } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.zone.count({ where }),
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
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: { createdBy: { select: creatorSelect } },
    });
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  async update(id: number, dto: UpdateZoneDto) {
    await this.ensureZoneExists(id);
    try {
      return await this.prisma.zone.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim().toUpperCase(),
          description: dto.description?.trim(),
          isLocal: dto.isLocal,
          codeExternal: dto.codeExternal?.trim(),
        },
        include: { createdBy: { select: creatorSelect } },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async changeStatus(id: number, dto: ChangeZoneStatusDto) {
    await this.ensureZoneExists(id);
    return this.prisma.zone.update({
      where: { id },
      data: { status: dto.status },
      include: { createdBy: { select: creatorSelect } },
    });
  }

  private async ensureZoneExists(id: number): Promise<void> {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!zone) throw new NotFoundException('Zone not found');
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Zone name or code is already in use');
    }
  }
}
