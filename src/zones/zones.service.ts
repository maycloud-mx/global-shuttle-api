import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransferPointType } from '../generated/prisma/index.js';
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

const zoneInclude = {
  createdBy: { select: creatorSelect },
  airportTimes: {
    include: {
      transferPoint: {
        select: {
          id: true,
          zoneId: true,
          name: true,
          code: true,
          codeExternal: true,
          type: true,
          latitude: true,
          longitude: true,
          status: true,
        },
      },
    },
    orderBy: { transferPointId: 'asc' },
  },
} as const;

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateZoneDto, createdById: number) {
    await this.ensureValidAirports(dto.airportTimes);
    try {
      return await this.prisma.zone.create({
        data: {
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          description: dto.description?.trim(),
          isLocal: dto.isLocal,
          codeExternal: dto.codeExternal?.trim(),
          createdById,
          airportTimes: dto.airportTimes?.length
            ? {
                create: dto.airportTimes.map(({ transferPointId, hours }) => ({
                  transferPointId,
                  hours,
                })),
              }
            : undefined,
        },
        include: zoneInclude,
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
        include: zoneInclude,
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
      include: zoneInclude,
    });
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  async update(id: number, dto: UpdateZoneDto) {
    await this.ensureZoneExists(id);
    await this.ensureValidAirports(dto.airportTimes);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (dto.airportTimes !== undefined) {
          await transaction.zoneTransferPointTime.deleteMany({
            where: { zoneId: id },
          });
        }

        return transaction.zone.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            code: dto.code?.trim().toUpperCase(),
            description: dto.description?.trim(),
            isLocal: dto.isLocal,
            codeExternal: dto.codeExternal?.trim(),
            airportTimes:
              dto.airportTimes !== undefined && dto.airportTimes.length > 0
                ? {
                    create: dto.airportTimes.map(
                      ({ transferPointId, hours }) => ({
                        transferPointId,
                        hours,
                      }),
                    ),
                  }
                : undefined,
          },
          include: zoneInclude,
        });
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
      include: zoneInclude,
    });
  }

  private async ensureZoneExists(id: number): Promise<void> {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!zone) throw new NotFoundException('Zone not found');
  }

  private async ensureValidAirports(
    airportTimes: CreateZoneDto['airportTimes'],
  ): Promise<void> {
    if (airportTimes === undefined || airportTimes.length === 0) return;

    const requestedIds = airportTimes.map(({ transferPointId }) =>
      transferPointId,
    );
    const airports = await this.prisma.transferPoint.findMany({
      where: {
        id: { in: requestedIds },
        type: TransferPointType.AIRPORT,
      },
      select: { id: true },
    });

    if (airports.length !== requestedIds.length) {
      throw new BadRequestException(
        'Every transfer point must exist and be of type AIRPORT',
      );
    }
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
