import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import type { CreateReservationDto } from '../dto/create-reservation.dto.js';

const QUOTATION_STATUS_CODE = 'QUOTATION';
const CANCUN_TIME_ZONE = 'America/Cancun';

const MAX_MONTHLY_SEQUENCE = 9999;
const MAX_TRANSACTION_ATTEMPTS = 5;

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
    // RESOLVE MONTHLY PERIOD
    // =========================================================

    const period = this.getCancunPeriod();

    // =========================================================
    // CREATE RESERVATION WITH MONTHLY FOLIO
    // =========================================================

    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // =================================================
            // GET NEXT MONTHLY SEQUENCE
            // =================================================

            const counter = await tx.reservationFolioCounter.upsert({
              where: {
                period,
              },
              create: {
                period,
                sequence: 1,
              },
              update: {
                sequence: {
                  increment: 1,
                },
              },
              select: {
                sequence: true,
              },
            });

            if (counter.sequence > MAX_MONTHLY_SEQUENCE) {
              throw new ConflictException(
                'Monthly reservation folio limit reached',
              );
            }

            // =================================================
            // GENERATE FOLIO
            // =================================================

            const folio = this.generateFolio(period, counter.sequence);

            // =================================================
            // CREATE RESERVATION
            // =================================================

            return tx.reservation.create({
              data: {
                folio,

                currency: {
                  connect: {
                    id: currency.id,
                  },
                },

                subtotal: 0,
                discount: 0,
                total: 0,
                paidAmount: 0,
                pendingAmount: 0,

                reservationStatus: {
                  connect: {
                    id: reservationStatus.id,
                  },
                },

                paymentStatus: 'PENDING',
                source: 'ADMIN',

                createdBy: {
                  connect: {
                    id: userId,
                  },
                },

                reservationCustomer: {
                  create: {
                    firstName: dto.customer.firstName.trim(),

                    lastName: dto.customer.lastName.trim(),

                    email: dto.customer.email.trim().toLowerCase(),

                    phone: dto.customer.phone?.trim() || null,

                    country: dto.customer.countryId
                      ? {
                          connect: {
                            id: dto.customer.countryId,
                          },
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
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        // =====================================================
        // RETRY TRANSACTION CONFLICTS
        // =====================================================

        const isRetryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' || error.code === 'P2002');

        if (!isRetryable || attempt === MAX_TRANSACTION_ATTEMPTS) {
          throw error;
        }
      }
    }

    throw new ConflictException(
      'Unable to generate a unique reservation folio',
    );
  }

  // =========================================================
  // GET CURRENT PERIOD IN CANCUN
  // =========================================================

  private getCancunPeriod(): string {
    const dateParts = new Intl.DateTimeFormat('en-US', {
      timeZone: CANCUN_TIME_ZONE,
      year: '2-digit',
      month: '2-digit',
    }).formatToParts(new Date());

    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      dateParts.find((part) => part.type === type)?.value ?? '';

    return `${getPart('year')}${getPart('month')}`;
  }

  // =========================================================
  // GENERATE RESERVATION FOLIO
  // =========================================================

  private generateFolio(period: string, sequence: number): string {
    const consecutive = sequence.toString().padStart(4, '0');

    return `GS-${period}-${consecutive}`;
  }
}
