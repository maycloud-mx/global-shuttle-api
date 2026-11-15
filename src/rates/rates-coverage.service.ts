
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface CatalogReference {
  id: number;
  name: string;
  code?: string;
}

export interface CoverageStats {
  expected: number;
  configured: number;
  pending: number;
  missing: number;
  inactive: number;
  coveragePercentage: number | null;
  pendingPercentage: number | null;
}

@Injectable()
export class RatesCoverageService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateStats(
    expected: number,
    configured: number,
    inactive: number,
  ): CoverageStats {
    const missing = expected - configured - inactive;
    const pending = missing + inactive;

    const percentage = (value: number): number | null =>
      expected === 0
        ? null
        : Math.round((value / expected) * 10000) / 100;

    return {
      expected,
      configured,
      pending,
      missing,
      inactive,
      coveragePercentage: percentage(configured),
      pendingPercentage: percentage(pending),
    };
  }

  async getSummary() {
    const [zones, vehicles, currencies, serviceTypes] =
      await Promise.all([
        this.prisma.zone.findMany({
          where: { status: true },
          select: { id: true, name: true, code: true },
          orderBy: { id: 'asc' },
        }),
        this.prisma.vehicle.findMany({
          where: { status: true },
          select: { id: true, name: true },
          orderBy: { id: 'asc' },
        }),
        this.prisma.currency.findMany({
          where: { status: true },
          select: { id: true, name: true, code: true },
          orderBy: { id: 'asc' },
        }),
        this.prisma.serviceType.findMany({
          where: { status: true },
          select: { id: true, name: true, code: true },
          orderBy: { id: 'asc' },
        }),
      ]);

    const zoneCount = zones.length;
    const vehicleCount = vehicles.length;
    const currencyCount = currencies.length;
    const serviceCount = serviceTypes.length;

    const expected =
      zoneCount *
      zoneCount *
      vehicleCount *
      currencyCount *
      serviceCount;

    const breakdown = (
      items: CatalogReference[],
      expectedPerItem: number,
      configuredCounts: Map<number, number>,
      inactiveCounts: Map<number, number>,
    ) =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        ...(item.code ? { code: item.code } : {}),
        ...this.calculateStats(
          expectedPerItem,
          configuredCounts.get(item.id) ?? 0,
          inactiveCounts.get(item.id) ?? 0,
        ),
      }));

    if (expected === 0) {
      return {
        summary: this.calculateStats(0, 0, 0),
        zones: {
          total: zoneCount,
          complete: 0,
          incomplete: 0,
        },
        catalogs: {
          zones: zoneCount,
          vehicles: vehicleCount,
          currencies: currencyCount,
          serviceTypes: serviceCount,
        },
        breakdown: {
          byVehicle: breakdown(
            vehicles, 0, new Map(), new Map(),
          ),
          byCurrency: breakdown(
            currencies, 0, new Map(), new Map(),
          ),
          byServiceType: breakdown(
            serviceTypes, 0, new Map(), new Map(),
          ),
        },
      };
    }

    const rates = await this.prisma.rate.findMany({
      where: {
        originZone: { status: true },
        destinationZone: { status: true },
        vehicle: { status: true },
        currency: { status: true },
        serviceType: { status: true },
      },
      select: {
        originZoneId: true,
        destinationZoneId: true,
        vehicleId: true,
        currencyId: true,
        serviceTypeId: true,
        status: true,
      },
    });

    let configured = 0;
    let inactive = 0;

    const configuredVehicles = new Map<number, number>();
    const inactiveVehicles = new Map<number, number>();
    const configuredCurrencies = new Map<number, number>();
    const inactiveCurrencies = new Map<number, number>();
    const configuredServices = new Map<number, number>();
    const inactiveServices = new Map<number, number>();

    const zoneCoverage = new Map<number, number>();

    function increment(map: Map<number, number>, id: number) {
      map.set(id, (map.get(id) ?? 0) + 1);
    }

    for (const rate of rates) {
      const active = rate.status;

      if (active) {
        configured++;
        increment(configuredVehicles, rate.vehicleId);
        increment(configuredCurrencies, rate.currencyId);
        increment(configuredServices, rate.serviceTypeId);

        increment(zoneCoverage, rate.originZoneId);

        if (rate.originZoneId !== rate.destinationZoneId) {
          increment(zoneCoverage, rate.destinationZoneId);
        }
      } else {
        inactive++;
        increment(inactiveVehicles, rate.vehicleId);
        increment(inactiveCurrencies, rate.currencyId);
        increment(inactiveServices, rate.serviceTypeId);
      }
    }

    const expectedPerZone =
      (2 * zoneCount - 1) *
      vehicleCount *
      currencyCount *
      serviceCount;

    const completeZones = zones.filter(
      (zone) =>
        (zoneCoverage.get(zone.id) ?? 0) === expectedPerZone,
    ).length;

    return {
      summary: this.calculateStats(
        expected,
        configured,
        inactive,
      ),
      zones: {
        total: zoneCount,
        complete: completeZones,
        incomplete: zoneCount - completeZones,
      },
      catalogs: {
        zones: zoneCount,
        vehicles: vehicleCount,
        currencies: currencyCount,
        serviceTypes: serviceCount,
      },
      breakdown: {
        byVehicle: breakdown(
          vehicles,
          zoneCount * zoneCount * currencyCount * serviceCount,
          configuredVehicles,
          inactiveVehicles,
        ),
        byCurrency: breakdown(
          currencies,
          zoneCount * zoneCount * vehicleCount * serviceCount,
          configuredCurrencies,
          inactiveCurrencies,
        ),
        byServiceType: breakdown(
          serviceTypes,
          zoneCount * zoneCount * vehicleCount * currencyCount,
          configuredServices,
          inactiveServices,
        ),
      },
    };
  }
}
