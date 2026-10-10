import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangeRateStatusDto } from './dto/change-rate-status.dto.js';
import type { CreateRateDto } from './dto/create-rate.dto.js';
import type { ListRatesDto } from './dto/list-rates.dto.js';
import type { UpdateRateDto } from './dto/update-rate.dto.js';

const userSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
} as const;

const rateInclude = {
  originZone: { select: { id: true, name: true, code: true } },
  destinationZone: { select: { id: true, name: true, code: true } },
  vehicle: { select: { id: true, name: true, code: true } },
  currency: { select: { id: true, name: true, code: true } },
  serviceType: { select: { id: true, name: true, code: true } },
  createdBy: { select: userSelect },
  updatedBy: { select: userSelect },
} as const;

@Injectable()
export class RatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRateDto, userId: number) {
    await this.ensureReferencesExist(dto);
    try {
      return await this.prisma.rate.create({
        data: {
          originZoneId: dto.originZoneId,
          destinationZoneId: dto.destinationZoneId,
          vehicleId: dto.vehicleId,
          currencyId: dto.currencyId,
          serviceTypeId: dto.serviceTypeId,
          price: dto.price,
          createdById: userId,
          updatedById: userId,
        },
        include: rateInclude,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async findAll(query: ListRatesDto) {
    const where: Prisma.RateWhereInput = {
      originZoneId: query.originZoneId,
      destinationZoneId: query.destinationZoneId,
      vehicleId: query.vehicleId,
      currencyId: query.currencyId,
      serviceTypeId: query.serviceTypeId,
      status: query.status,
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rate.findMany({
        where,
        include: rateInclude,
        orderBy: [{ originZoneId: 'asc' }, { destinationZoneId: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.rate.count({ where }),
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
    const rate = await this.prisma.rate.findUnique({
      where: { id },
      include: rateInclude,
    });
    if (!rate) throw new NotFoundException('Rate not found');
    return rate;
  }

  async update(id: number, dto: UpdateRateDto, userId: number) {
    const current = await this.findRateIds(id);
    await this.ensureReferencesExist({
      originZoneId: dto.originZoneId ?? current.originZoneId,
      destinationZoneId: dto.destinationZoneId ?? current.destinationZoneId,
      vehicleId: dto.vehicleId ?? current.vehicleId,
      currencyId: dto.currencyId ?? current.currencyId,
      serviceTypeId: dto.serviceTypeId ?? current.serviceTypeId,
    });
    try {
      return await this.prisma.rate.update({
        where: { id },
        data: {
          originZoneId: dto.originZoneId,
          destinationZoneId: dto.destinationZoneId,
          vehicleId: dto.vehicleId,
          currencyId: dto.currencyId,
          serviceTypeId: dto.serviceTypeId,
          price: dto.price,
          updatedById: userId,
        },
        include: rateInclude,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async changeStatus(id: number, dto: ChangeRateStatusDto, userId: number) {
    await this.ensureRateExists(id);
    return this.prisma.rate.update({
      where: { id },
      data: { status: dto.status, updatedById: userId },
      include: rateInclude,
    });
  }

  private async findRateIds(id: number) {
    const rate = await this.prisma.rate.findUnique({
      where: { id },
      select: {
        originZoneId: true,
        destinationZoneId: true,
        vehicleId: true,
        currencyId: true,
        serviceTypeId: true,
      },
    });
    if (!rate) throw new NotFoundException('Rate not found');
    return rate;
  }

  private async ensureRateExists(id: number): Promise<void> {
    const rate = await this.prisma.rate.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!rate) throw new NotFoundException('Rate not found');
  }

  private async ensureReferencesExist(ids: {
    originZoneId: number;
    destinationZoneId: number;
    vehicleId: number;
    currencyId: number;
    serviceTypeId: number;
  }): Promise<void> {
    const [originZone, destinationZone, vehicle, currency, serviceType] =
      await this.prisma.$transaction([
        this.prisma.zone.findUnique({
          where: { id: ids.originZoneId },
          select: { id: true },
        }),
        this.prisma.zone.findUnique({
          where: { id: ids.destinationZoneId },
          select: { id: true },
        }),
        this.prisma.vehicle.findUnique({
          where: { id: ids.vehicleId },
          select: { id: true },
        }),
        this.prisma.currency.findUnique({
          where: { id: ids.currencyId },
          select: { id: true },
        }),
        this.prisma.serviceType.findUnique({
          where: { id: ids.serviceTypeId },
          select: { id: true },
        }),
      ]);

    if (!originZone) throw new NotFoundException('Origin zone not found');
    if (!destinationZone)
      throw new NotFoundException('Destination zone not found');
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (!currency) throw new NotFoundException('Currency not found');
    if (!serviceType) throw new NotFoundException('Service type not found');
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A rate already exists for this combination');
    }
  }
}
