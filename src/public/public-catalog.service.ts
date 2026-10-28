import { Injectable, NotFoundException } from '@nestjs/common';
import { TransferPointType } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DEFAULT_AIRPORT_TRANSFER_HOURS = 1.5;

const transferPointSelect = {
  id: true,
  name: true,
  type: true,
} as const;

@Injectable()
export class PublicCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  findCurrencies() {
    return this.prisma.currency.findMany({
      where: { status: true },
      select: { id: true, name: true, code: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  findServiceTypes() {
    return this.prisma.serviceType.findMany({
      where: { status: true },
      select: { id: true, name: true, code: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  findCountries() {
    return this.prisma.country.findMany({
      where: { status: true },
      select: { id: true, name: true, iso2: true, phoneCode: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  findAirlines() {
    return this.prisma.airline.findMany({
      where: { status: true },
      select: {
        id: true,
        name: true,
        iataCode: true,
        icaoCode: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async findTransferPoints(originTransferPointId?: number) {
    if (originTransferPointId === undefined) {
      const transferPoints = await this.prisma.transferPoint.findMany({
        where: { status: true },
        select: transferPointSelect,
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
        where: { status: true, id: { not: origin.id } },
        select: transferPointSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });

      return transferPoints.map((transferPoint) => ({
        ...transferPoint,
        hours: null,
      }));
    }

    const transferPoints = await this.prisma.transferPoint.findMany({
      where: { status: true, id: { not: origin.id } },
      select: {
        ...transferPointSelect,
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
}
