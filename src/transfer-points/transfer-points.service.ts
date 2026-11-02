import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createConnection, type RowDataPacket } from 'mysql2/promise';
import { Prisma, TransferPointType } from '../generated/prisma/index.js';
import { loadEnvironment } from '../config/environment.js';
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

const DEFAULT_AIRPORT_TRANSFER_HOURS = 1.5;

const transferPointOptionSelect = {
  id: true,
  name: true,
  type: true,
} as const;

interface ExternalHotelRow extends RowDataPacket {
  zoneId: number;
  name: string;
  code: string;
  codeExternal: string | number;
  latitude: string | number | null;
  longitude: string | number | null;
  status: number | boolean;
}

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

  async findOptions(originTransferPointId?: number) {
    if (originTransferPointId === undefined) {
      const transferPoints = await this.prisma.transferPoint.findMany({
        where: { status: true },
        select: transferPointOptionSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });

      return transferPoints.map((transferPoint) => ({
        ...transferPoint,
        hours: null,
      }));
    }

    const origin = await this.prisma.transferPoint.findFirst({
      where: { id: originTransferPointId, status: true },
      select: { id: true, type: true, zoneId: true },
    });
    if (!origin) {
      throw new NotFoundException('Active origin transfer point not found');
    }

    if (origin.type !== TransferPointType.HOTEL) {
      const transferPoints = await this.prisma.transferPoint.findMany({
        where: {
          status: true,
          id: { not: origin.id },
        },
        select: transferPointOptionSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });

      return transferPoints.map((transferPoint) => ({
        ...transferPoint,
        hours: null,
      }));
    }

    const transferPoints = await this.prisma.transferPoint.findMany({
      where: {
        status: true,
        id: { not: origin.id },
      },
      select: {
        ...transferPointOptionSelect,
        zoneTimes: {
          where: { zoneId: origin.zoneId },
          select: { hours: true },
          take: 1,
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return transferPoints.map(({ zoneTimes, ...transferPoint }) => ({
      ...transferPoint,
      hours:
        transferPoint.type === TransferPointType.AIRPORT
          ? Number(zoneTimes[0]?.hours ?? DEFAULT_AIRPORT_TRANSFER_HOURS)
          : null,
    }));
  }

  async findAirports() {
    return this.prisma.transferPoint.findMany({
      where: {
        type: TransferPointType.AIRPORT,
        status: true,
      },
      include: transferPointInclude,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async syncHotels(userId: number) {
    const config = loadEnvironment();
    let connection;

    try {
      connection = await createConnection({
        host: config.EXTERNAL_DB_HOST,
        port: config.EXTERNAL_DB_PORT,
        database: config.EXTERNAL_DB_DATABASE,
        user: config.EXTERNAL_DB_USERNAME,
        password: config.EXTERNAL_DB_PASSWORD,
        charset: 'utf8mb4',
        connectTimeout: 10_000,
      });

      const [hotels] = await connection.query<ExternalHotelRow[]>(`
        SELECT
          zone_id AS zoneId,
          name,
          code,
          code_external AS codeExternal,
          latitude,
          longitude,
          status
        FROM transfer_points
        WHERE LOWER(type) = 'hotel'
          AND code_external IS NOT NULL
        ORDER BY id
      `);

      const zones = await this.prisma.zone.findMany({
        where: { codeExternal: { not: null } },
        select: { id: true, codeExternal: true },
      });
      const zoneByExternalId = new Map(
        zones.map((zone) => [zone.codeExternal!, zone.id]),
      );
      const externalCodes = hotels.map((hotel) => String(hotel.codeExternal));
      const existingHotels = await this.prisma.transferPoint.findMany({
        where: {
          type: TransferPointType.HOTEL,
          codeExternal: { in: externalCodes },
        },
        select: { id: true, codeExternal: true },
      });
      const existingByExternalCode = new Map(
        existingHotels.map((hotel) => [hotel.codeExternal!, hotel.id]),
      );

      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      const missingZoneExternalIds = new Set<number>();

      await this.prisma.$transaction(async (transaction) => {
        for (const hotel of hotels) {
          const zoneId = zoneByExternalId.get(String(hotel.zoneId));
          if (zoneId === undefined) {
            skipped++;
            missingZoneExternalIds.add(hotel.zoneId);
            continue;
          }

          const codeExternal = String(hotel.codeExternal);
          const data = {
            zoneId,
            name: hotel.name.trim(),
            code: hotel.code.trim(),
            codeExternal,
            type: TransferPointType.HOTEL,
            latitude: hotel.latitude === null ? null : Number(hotel.latitude),
            longitude:
              hotel.longitude === null ? null : Number(hotel.longitude),
            status: Boolean(hotel.status),
          };
          const existingId = existingByExternalCode.get(codeExternal);

          if (existingId !== undefined) {
            await transaction.transferPoint.update({
              where: { id: existingId },
              data: { ...data, updatedById: userId },
            });
            updated++;
          } else {
            const created = await transaction.transferPoint.create({
              data: { ...data, createdById: userId },
              select: { id: true },
            });
            existingByExternalCode.set(codeExternal, created.id);
            inserted++;
          }
        }
      });

      return {
        found: hotels.length,
        inserted,
        updated,
        skipped,
        missingZoneExternalIds: [...missingZoneExternalIds].sort(
          (first, second) => first - second,
        ),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) throw error;
      throw new BadGatewayException(
        'Could not synchronize hotels from the external database',
      );
    } finally {
      await connection?.end();
    }
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
