import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangeTransferPointStatusDto } from './dto/change-transfer-point-status.dto.js';
import type { CreateTransferPointDto } from './dto/create-transfer-point.dto.js';
import type { ListTransferPointsDto } from './dto/list-transfer-points.dto.js';
import type { UpdateTransferPointDto } from './dto/update-transfer-point.dto.js';

const userSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
} as const;

const transferPointInclude = {
  zone: { select: { id: true, name: true, code: true } },
  createdBy: { select: userSelect },
  updatedBy: { select: userSelect },
} as const;

@Injectable()
export class TransferPointsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransferPointDto, userId: number) {
    await this.ensureZoneExists(dto.zoneId);
    try {
      return await this.prisma.transferPoint.create({
        data: {
          zoneId: dto.zoneId,
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          codeExternal: dto.codeExternal?.trim(),
          type: dto.type,
          latitude: dto.latitude,
          longitude: dto.longitude,
          createdById: userId,
        },
        include: transferPointInclude,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async findAll(query: ListTransferPointsDto) {
    const search = query.search?.trim();
    const where: Prisma.TransferPointWhereInput = {
      zoneId: query.zoneId,
      type: query.type,
      status: query.status,
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
      this.prisma.transferPoint.findMany({
        where,
        include: transferPointInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.transferPoint.count({ where }),
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
    const transferPoint = await this.prisma.transferPoint.findUnique({
      where: { id },
      include: transferPointInclude,
    });
    if (!transferPoint) {
      throw new NotFoundException('Transfer point not found');
    }
    return transferPoint;
  }

  async update(id: number, dto: UpdateTransferPointDto, userId: number) {
    await this.ensureTransferPointExists(id);
    if (dto.zoneId !== undefined) await this.ensureZoneExists(dto.zoneId);

    try {
      return await this.prisma.transferPoint.update({
        where: { id },
        data: {
          zoneId: dto.zoneId,
          name: dto.name?.trim(),
          code: dto.code?.trim().toUpperCase(),
          codeExternal: dto.codeExternal?.trim(),
          type: dto.type,
          latitude: dto.latitude,
          longitude: dto.longitude,
          updatedById: userId,
        },
        include: transferPointInclude,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async changeStatus(
    id: number,
    dto: ChangeTransferPointStatusDto,
    userId: number,
  ) {
    await this.ensureTransferPointExists(id);
    return this.prisma.transferPoint.update({
      where: { id },
      data: { status: dto.status, updatedById: userId },
      include: transferPointInclude,
    });
  }

  private async ensureTransferPointExists(id: number): Promise<void> {
    const transferPoint = await this.prisma.transferPoint.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!transferPoint) {
      throw new NotFoundException('Transfer point not found');
    }
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
      throw new ConflictException(
        'Transfer point code or zone/name combination is already in use',
      );
    }
  }
}
