import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service.js';

import type { CreateReservationDto } from '../dto/create-reservation.dto.js';

const QUOTATION_STATUS_CODE = 'QUOTATION';
const CANCUN_TIME_ZONE = 'America/Cancun';

@Injectable()
export class ReservationCreateService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // CREATE RESERVATION
  // =========================================================

  async create(dto: CreateReservationDto, userId: number) {
    // =========================================================
    // VALIDATE CURRENCY AND INITIAL STATUS
    // =========================================================

    const [currency, reservationStatus] = await Promise.all([
      this.prisma.currency.findFirst({
        where: {
          id: dto.currencyId,
          status: true,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      }),

      this.prisma.reservationStatus.findFirst({
        where: {
          code: QUOTATION_STATUS_CODE,
          status: true,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!currency) {
      throw new NotFoundException('Active currency not found');
    }

    if (!reservationStatus) {
      throw new NotFoundException(
        'Active quotation reservation status not found',
      );
    }

    // =========================================================
    // VALIDATE CUSTOMER COUNTRY
    // =========================================================

    if (dto.customer.countryId) {
      const country = await this.prisma.country.findFirst({
        where: {
          id: dto.customer.countryId,
          status: true,
        },
        select: {
          id: true,
        },
      });

      if (!country) {
        throw new NotFoundException('Active customer country not found');
      }
    }

    // =========================================================
    // CREATE RESERVATION
    // =========================================================

    return this.prisma.reservation.create({
      data: {
        folio: this.generateFolio(),

        currency: {
          connect: { id: currency.id },
        },

        subtotal: 0,
        discount: 0,
        total: 0,
        paidAmount: 0,
        pendingAmount: 0,

        reservationStatus: {
          connect: { id: reservationStatus.id },
        },

        paymentStatus: 'PENDING',
        source: 'ADMIN',

        createdBy: {
          connect: { id: userId },
        },

        reservationCustomer: {
          create: {
            firstName: dto.customer.firstName.trim(),
            lastName: dto.customer.lastName.trim(),
            email: dto.customer.email.trim().toLowerCase(),
            phone: dto.customer.phone?.trim() || null,

            country: dto.customer.countryId
              ? {
                  connect: { id: dto.customer.countryId },
                }
              : undefined,
          },
        },
      },

      include: {
        currency: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        reservationStatus: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        reservationCustomer: {
          include: {
            country: {
              select: {
                id: true,
                name: true,
                iso2: true,
                phoneCode: true,
              },
            },
          },
        },

        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },

        transfers: true,
      },
    });
  }

  // =========================================================
  // GENERATE RESERVATION FOLIO
  // =========================================================

  private generateFolio(): string {
    const dateParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: CANCUN_TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(new Date());

    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      dateParts.find((part) => part.type === type)?.value ?? '';

    const date = `${getPart('day')}${getPart('month')}${getPart('year')}`;

    const suffix = randomUUID().slice(0, 8).toUpperCase();

    return `GS-${date}-${suffix}`;
  }
}
