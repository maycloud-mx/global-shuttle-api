import { BadRequestException, Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import type { DashboardFiltersDto } from '../dto/dashboard-filters.dto.js';

const CANCUN_TIME_ZONE = 'America/Cancun';
const CANCUN_UTC_OFFSET = '-05:00';
const DEFAULT_DAYS = 30;
const MAX_DAYS = 366;

@Injectable()
export class DashboardOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // OVERVIEW
  // =========================================================

  async getOverview(query: DashboardFiltersDto) {
    const { dateFrom, dateTo } = this.resolvePeriod(query);

    // Reservation creation dates are timestamps.
    const createdAt: Prisma.DateTimeFilter = {
      gte: new Date(`${dateFrom}T00:00:00${CANCUN_UTC_OFFSET}`),
      lt: this.toNextCancunDay(dateTo),
    };

    // serviceDate is a MySQL DATE column, not a timestamp.
    const serviceDate: Prisma.DateTimeFilter = {
      gte: new Date(`${dateFrom}T00:00:00.000Z`),
      lt: this.toNextUtcDay(dateTo),
    };

    // =====================================================
    // QUERIES
    // =====================================================

    const [
      totalReservations,
      quotations,
      cancellations,
      scheduledTransfers,
      reservationDates,
    ] = await Promise.all([
      this.prisma.reservation.count({
        where: { createdAt },
      }),

      this.prisma.reservation.count({
        where: {
          createdAt,
          reservationStatus: {
            code: 'QUOTATION',
          },
        },
      }),

      this.prisma.reservation.count({
        where: {
          createdAt,
          reservationStatus: {
            code: 'CANCELLED',
          },
        },
      }),

      this.prisma.reservationTransfer.count({
        where: {
          serviceDate,
          reservation: {
            reservationStatus: {
              code: { not: 'CANCELLED' },
            },
          },
        },
      }),

      this.prisma.reservation.findMany({
        where: { createdAt },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    // =====================================================
    // CHART: RESERVATIONS BY DAY
    // =====================================================

    const reservationsByDay = this.buildDailyChart(
      dateFrom,
      dateTo,
      reservationDates,
    );

    // =====================================================
    // RESPONSE
    // =====================================================

    return {
      period: {
        dateFrom,
        dateTo,
        timeZone: CANCUN_TIME_ZONE,
      },

      summary: {
        totalReservations,
        quotations,
        cancellations,
        scheduledTransfers,

        quotationPercentage: this.percentage(quotations, totalReservations),

        cancellationPercentage: this.percentage(
          cancellations,
          totalReservations,
        ),
      },

      charts: {
        reservationsByDay,
      },
    };
  }

  // =========================================================
  // PERIOD
  // =========================================================

  private resolvePeriod(query: DashboardFiltersDto) {
    const today = this.getCancunToday();

    const dateTo = query.dateTo ?? today;

    const dateFrom =
      query.dateFrom ??
      (query.dateTo ? dateTo : this.addDays(dateTo, -(DEFAULT_DAYS - 1)));

    this.validateDate(dateFrom);
    this.validateDate(dateTo);

    if (dateFrom > dateTo) {
      throw new BadRequestException('Date from cannot be later than date to');
    }

    const days =
      Math.round(
        (Date.parse(`${dateTo}T00:00:00Z`) -
          Date.parse(`${dateFrom}T00:00:00Z`)) /
          86400000,
      ) + 1;

    if (days > MAX_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_DAYS} days`,
      );
    }

    return { dateFrom, dateTo };
  }

  // =========================================================
  // DAILY CHART
  // =========================================================

  private buildDailyChart(
    dateFrom: string,
    dateTo: string,
    reservations: { createdAt: Date }[],
  ) {
    const counts = new Map<string, number>();

    for (const reservation of reservations) {
      const date = this.formatCancunDate(reservation.createdAt);

      counts.set(date, (counts.get(date) ?? 0) + 1);
    }

    const result: {
      date: string;
      total: number;
    }[] = [];

    for (let date = dateFrom; date <= dateTo; date = this.addDays(date, 1)) {
      result.push({
        date,
        total: counts.get(date) ?? 0,
      });
    }

    return result;
  }

  // =========================================================
  // PERCENTAGE
  // =========================================================

  private percentage(value: number, total: number): number {
    if (total === 0) return 0;

    return Number(((value / total) * 100).toFixed(2));
  }

  // =========================================================
  // DATE UTILITIES
  // =========================================================

  private getCancunToday(): string {
    return this.formatCancunDate(new Date());
  }

  private formatCancunDate(value: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CANCUN_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';

    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  private addDays(value: string, days: number): string {
    const date = new Date(`${value}T00:00:00.000Z`);

    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
  }

  private toNextCancunDay(value: string): Date {
    const nextDate = this.addDays(value, 1);

    return new Date(`${nextDate}T00:00:00${CANCUN_UTC_OFFSET}`);
  }

  private toNextUtcDay(value: string): Date {
    return new Date(`${this.addDays(value, 1)}T00:00:00.000Z`);
  }

  private validateDate(value: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Invalid date format');
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException('Invalid calendar date');
    }
  }
}
