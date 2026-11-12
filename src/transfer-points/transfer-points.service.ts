import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
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
const HOTEL_SYNC_BATCH_SIZE = 100;
const HOTEL_SYNC_TRANSACTION_TIMEOUT_MS = 60_000;

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

  async checkExternalDatabase() {
    const startedAt = Date.now();
    let connection;

    try {
      const config = loadEnvironment();
      connection = await createConnection({
        host: config.EXTERNAL_DB_HOST,
        port: config.EXTERNAL_DB_PORT,
        database: config.EXTERNAL_DB_DATABASE,
        user: config.EXTERNAL_DB_USERNAME,
        password: config.EXTERNAL_DB_PASSWORD,
        charset: 'utf8mb4',
        connectTimeout: 10_000,
      });
      await connection.query('SELECT 1');

      return {
        connected: true,
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      throw new ServiceUnavailableException(
        'Could not connect to the external database',
      );
    } finally {
      await connection?.end();
    }
  }

  async syncHotels(userId: number) {
    let connection;

    try {
      const config = loadEnvironment();
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
      const existingTransferPoints = await this.prisma.transferPoint.findMany({
        select: {
          zoneId: true,
          name: true,
          code: true,
          codeExternal: true,
          type: true,
        },
      });
      const existingExternalCodes = new Set(
        existingTransferPoints
          .filter(
            (point) =>
              point.type === TransferPointType.HOTEL &&
              point.codeExternal !== null,
          )
          .map((point) => point.codeExternal!),
      );
      const existingCodes = new Set(
        existingTransferPoints.map((point) => point.code.trim().toLowerCase()),
      );
      const existingZoneNames = new Set(
        existingTransferPoints.map((point) =>
          this.buildZoneNameKey(point.zoneId, point.name),
        ),
      );

      const hotelsToInsert: Array<{
        hotel: ExternalHotelRow;
        zoneId: number;
      }> = [];
      let skippedExisting = 0;
      let inserted = 0;
      let skippedMissingZone = 0;
      const missingZoneExternalIds = new Set<number>();

      for (const hotel of hotels) {
        const zoneId = zoneByExternalId.get(String(hotel.zoneId));
        if (zoneId === undefined) {
          skippedMissingZone++;
          missingZoneExternalIds.add(hotel.zoneId);
          continue;
        }

        const codeExternal = String(hotel.codeExternal);
        const normalizedCode = hotel.code.trim().toLowerCase();
        const zoneNameKey = this.buildZoneNameKey(zoneId, hotel.name);
        if (
          existingExternalCodes.has(codeExternal) ||
          existingCodes.has(normalizedCode) ||
          existingZoneNames.has(zoneNameKey)
        ) {
          skippedExisting++;
          continue;
        }

        hotelsToInsert.push({ hotel, zoneId });
        existingExternalCodes.add(codeExternal);
        existingCodes.add(normalizedCode);
        existingZoneNames.add(zoneNameKey);
      }

      for (
        let offset = 0;
        offset < hotelsToInsert.length;
        offset += HOTEL_SYNC_BATCH_SIZE
      ) {
        const batch = hotelsToInsert.slice(
          offset,
          offset + HOTEL_SYNC_BATCH_SIZE,
        );

        await this.prisma.$transaction(
          async (transaction) => {
            for (const { hotel, zoneId } of batch) {
              const codeExternal = String(hotel.codeExternal);
              const data = {
                zoneId,
                name: hotel.name.trim(),
                code: hotel.code.trim(),
                codeExternal,
                type: TransferPointType.HOTEL,
                latitude:
                  hotel.latitude === null ? null : Number(hotel.latitude),
                longitude:
                  hotel.longitude === null ? null : Number(hotel.longitude),
                status: Boolean(hotel.status),
              };
              await transaction.transferPoint.create({
                data: { ...data, createdById: userId },
              });
              inserted++;
            }
          },
          {
            maxWait: 10_000,
            timeout: HOTEL_SYNC_TRANSACTION_TIMEOUT_MS,
          },
        );
      }

      return {
        found: hotels.length,
        inserted,
        updated: 0,
        skipped: skippedExisting + skippedMissingZone,
        skippedExisting,
        skippedMissingZone,
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

  private buildZoneNameKey(zoneId: number, name: string): string {
    return `${zoneId}:${name.trim().toLowerCase()}`;
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
