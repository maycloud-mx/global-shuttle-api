import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

import type { BulkUpsertRatesDto } from './dto/bulk-upsert-rates.dto.js';

const MAX_BULK_COMBINATIONS = 5000;

@Injectable()
export class RatesBulkService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertBulk(dto: BulkUpsertRatesDto, userId: number) {
    // 1. Validar zonas de origen y destino.
    const zones = await this.prisma.zone.findMany({
      where: {
        id: {
          in: [dto.originZoneId, dto.destinationZoneId],
        },
        status: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const originZone = zones.find((zone) => zone.id === dto.originZoneId);

    const destinationZone = zones.find(
      (zone) => zone.id === dto.destinationZoneId,
    );

    if (!originZone) {
      throw new NotFoundException('Origin zone not found or inactive');
    }

    if (!destinationZone) {
      throw new NotFoundException('Destination zone not found or inactive');
    }

    // 2. Obtener los catálogos activos.
    const [vehicles, currencies, serviceTypes] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: {
          status: true,
          ...(dto.vehicleId !== undefined ? { id: dto.vehicleId } : {}),
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          id: 'asc',
        },
      }),

      this.prisma.currency.findMany({
        where: {
          status: true,
          ...(dto.currencyId !== undefined ? { id: dto.currencyId } : {}),
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: {
          id: 'asc',
        },
      }),

      this.prisma.serviceType.findMany({
        where: {
          status: true,
          ...(dto.serviceTypeId !== undefined ? { id: dto.serviceTypeId } : {}),
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: {
          id: 'asc',
        },
      }),
    ]);

    // 3. Verificar que existan opciones disponibles.
    if (vehicles.length === 0) {
      throw new BadRequestException(
        'No active vehicles found for the selected criteria',
      );
    }

    if (currencies.length === 0) {
      throw new BadRequestException(
        'No active currencies found for the selected criteria',
      );
    }

    if (serviceTypes.length === 0) {
      throw new BadRequestException(
        'No active service types found for the selected criteria',
      );
    }

    // 4. Calcular la cantidad de combinaciones.
    const totalCombinations =
      vehicles.length * currencies.length * serviceTypes.length;

    if (totalCombinations > MAX_BULK_COMBINATIONS) {
      throw new BadRequestException(
        `The request exceeds the maximum of ${MAX_BULK_COMBINATIONS} rate combinations`,
      );
    }

    // 5. Generar las combinaciones.
    const combinations = vehicles.flatMap((vehicle) =>
      currencies.flatMap((currency) =>
        serviceTypes.map((serviceType) => ({
          originZoneId: dto.originZoneId,
          destinationZoneId: dto.destinationZoneId,
          vehicleId: vehicle.id,
          currencyId: currency.id,
          serviceTypeId: serviceType.id,
          price: dto.price,
        })),
      ),
    );

    // 6. Crear o actualizar todas las tarifas.
    return this.prisma.$transaction(
      async (tx) => {
        // Consultar las tarifas existentes.
        const existingRates = await tx.rate.findMany({
          where: {
            originZoneId: dto.originZoneId,
            destinationZoneId: dto.destinationZoneId,
            vehicleId: {
              in: vehicles.map((item) => item.id),
            },
            currencyId: {
              in: currencies.map((item) => item.id),
            },
            serviceTypeId: {
              in: serviceTypes.map((item) => item.id),
            },
          },
          select: {
            id: true,
            vehicleId: true,
            currencyId: true,
            serviceTypeId: true,
          },
        });

        const createKey = (
          vehicleId: number,
          currencyId: number,
          serviceTypeId: number,
        ) => [vehicleId, currencyId, serviceTypeId].join(':');

        const existingKeys = new Set(
          existingRates.map((rate) =>
            createKey(rate.vehicleId, rate.currencyId, rate.serviceTypeId),
          ),
        );

        let created = 0;
        let updated = 0;

        for (const combination of combinations) {
          const key = createKey(
            combination.vehicleId,
            combination.currencyId,
            combination.serviceTypeId,
          );

          const alreadyExists = existingKeys.has(key);

          await tx.rate.upsert({
            where: {
              originZoneId_destinationZoneId_vehicleId_currencyId_serviceTypeId:
                {
                  originZoneId: combination.originZoneId,
                  destinationZoneId: combination.destinationZoneId,
                  vehicleId: combination.vehicleId,
                  currencyId: combination.currencyId,
                  serviceTypeId: combination.serviceTypeId,
                },
            },
            create: {
              ...combination,
              status: true,
              createdById: userId,
              updatedById: userId,
            },
            update: {
              price: combination.price,
              updatedById: userId,
            },
          });

          if (alreadyExists) {
            updated++;
          } else {
            created++;
          }
        }

        return {
          originZone,
          destinationZone,
          price: dto.price,
          summary: {
            total: combinations.length,
            created,
            updated,
          },
          appliedCatalogs: {
            vehicles,
            currencies,
            serviceTypes,
          },
        };
      },
      {
        maxWait: 5000,
        timeout: 180000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
