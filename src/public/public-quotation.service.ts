import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicQuoteOptionsDto } from './dto/public-quote-options.dto.js';

@Injectable()
export class PublicQuotationService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptions(dto: PublicQuoteOptionsDto) {
    if (dto.originTransferPointId === dto.destinationTransferPointId) {
      throw new BadRequestException(
        'Origin and destination transfer points must be different',
      );
    }

    const [serviceType, origin, destination] = await Promise.all([
      this.prisma.serviceType.findFirst({
        where: { id: dto.serviceTypeId, status: true },
        select: { id: true, name: true, code: true },
      }),
      this.prisma.transferPoint.findFirst({
        where: { id: dto.originTransferPointId, status: true },
        select: { id: true, name: true, type: true, zoneId: true },
      }),
      this.prisma.transferPoint.findFirst({
        where: { id: dto.destinationTransferPointId, status: true },
        select: { id: true, name: true, type: true, zoneId: true },
      }),
    ]);

    if (!serviceType) {
      throw new NotFoundException('Active service type not found');
    }
    if (!origin) {
      throw new NotFoundException('Active origin transfer point not found');
    }
    if (!destination) {
      throw new NotFoundException(
        'Active destination transfer point not found',
      );
    }

    const rates = await this.prisma.rate.findMany({
      where: {
        originZoneId: origin.zoneId,
        destinationZoneId: destination.zoneId,
        serviceTypeId: serviceType.id,
        status: true,
        currency: { status: true },
        vehicle: {
          status: true,
          minPax: { lte: dto.passengers },
          maxPax: { gte: dto.passengers },
        },
      },
      select: {
        id: true,
        price: true,
        currency: {
          select: { id: true, name: true, code: true },
        },
        vehicle: {
          select: {
            id: true,
            name: true,
            code: true,
            minPax: true,
            maxPax: true,
            luggageCapacity: true,
            descriptionEs: true,
            descriptionEn: true,
            image: true,
          },
        },
      },
      orderBy: [{ price: 'asc' }, { vehicleId: 'asc' }, { currencyId: 'asc' }],
    });

    return {
      serviceType,
      origin: {
        id: origin.id,
        name: origin.name,
        type: origin.type,
      },
      destination: {
        id: destination.id,
        name: destination.name,
        type: destination.type,
      },
      passengers: dto.passengers,
      luggage: dto.luggage,
      options: rates.map(({ id, price, currency, vehicle }) => ({
        rateId: id,
        price,
        currency,
        vehicle,
      })),
    };
  }
}
