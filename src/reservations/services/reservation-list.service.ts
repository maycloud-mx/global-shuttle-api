import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import type { ListReservationsDto } from '../dto/list-reservations.dto.js';

@Injectable()
export class ReservationListService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListReservationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    this.validateDateRange(
      query.createdDateFrom,
      query.createdDateTo,
      'Created date',
    );

    this.validateDateRange(
      query.serviceDateFrom,
      query.serviceDateTo,
      'Service date',
    );

    const createdAt =
      query.createdDateFrom || query.createdDateTo
        ? {
            gte: query.createdDateFrom
              ? this.toCancunStartOfDay(query.createdDateFrom)
              : undefined,
            lt: query.createdDateTo
              ? this.toCancunStartOfNextDay(query.createdDateTo)
              : undefined,
          }
        : undefined;

    const serviceDate =
      query.serviceDateFrom || query.serviceDateTo
        ? {
            gte: query.serviceDateFrom
              ? this.toDatabaseDate(query.serviceDateFrom)
              : undefined,
            lte: query.serviceDateTo
              ? this.toDatabaseDate(query.serviceDateTo)
              : undefined,
          }
        : undefined;

    const where: Prisma.ReservationWhereInput = {
      reservationStatusId: query.reservationStatusId,
      paymentStatus: query.paymentStatus?.trim() || undefined,
      currencyId: query.currencyId,
      createdAt,

      ...(serviceDate
        ? {
            transfers: {
              some: {
                serviceDate,
              },
            },
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                folio: {
                  contains: search,
                },
              },
              {
                businessPartnerCode: {
                  contains: search,
                },
              },
              {
                reservationCustomer: {
                  is: {
                    OR: [
                      {
                        firstName: {
                          contains: search,
                        },
                      },
                      {
                        lastName: {
                          contains: search,
                        },
                      },
                      {
                        email: {
                          contains: search,
                        },
                      },
                      {
                        phone: {
                          contains: search,
                        },
                      },
                      ...(search.split(/\s+/).length > 1
                        ? [
                            {
                              AND: search.split(/\s+/).map((term) => ({
                                OR: [
                                  {
                                    firstName: {
                                      contains: term,
                                    },
                                  },
                                  {
                                    lastName: {
                                      contains: term,
                                    },
                                  },
                                ],
                              })),
                            },
                          ]
                        : []),
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [reservations, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,

        select: {
          id: true,
          folio: true,

          subtotal: true,
          discount: true,
          total: true,
          paidAmount: true,
          pendingAmount: true,

          paymentStatus: true,
          source: true,

          businessPartnerCode: true,

          createdAt: true,
          updatedAt: true,

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
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              country: {
                select: {
                  id: true,
                  name: true,
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

          _count: {
            select: {
              transfers: true,
              payments: true,
              notes: true,
            },
          },

          transfers: {
            select: {
              id: true,

              segmentLeg: true,
              segmentType: true,

              serviceDate: true,
              serviceTime: true,
              pickupDate: true,
              pickupTime: true,

              passengers: true,

              serviceType: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },

              originTransferPoint: {
                select: {
                  id: true,
                  name: true,
                },
              },

              destinationTransferPoint: {
                select: {
                  id: true,
                  name: true,
                },
              },

              transferStatus: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },

            orderBy: [
              { serviceDate: 'asc' },
              { serviceTime: 'asc' },
              { id: 'asc' },
            ],
          },
        },

        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],

        skip: (page - 1) * limit,
        take: limit,
      }),

      this.prisma.reservation.count({
        where,
      }),
    ]);

    const items = reservations.map(
      ({
        reservationCustomer,
        createdBy,
        transfers,
        _count,
        ...reservation
      }) => ({
        ...reservation,

        customer: reservationCustomer
          ? {
              id: reservationCustomer.id,
              name: [
                reservationCustomer.firstName,
                reservationCustomer.lastName,
              ]
                .filter(Boolean)
                .join(' '),
              email: reservationCustomer.email,
              phone: reservationCustomer.phone,
              country: reservationCustomer.country,
            }
          : null,

        createdBy: {
          id: createdBy.id,
          username: createdBy.username,
          name: [createdBy.firstName, createdBy.lastName]
            .filter(Boolean)
            .join(' '),
        },

        transferCount: _count.transfers,
        paymentCount: _count.payments,
        noteCount: _count.notes,

        firstServiceDate: transfers[0]?.serviceDate ?? null,

        lastServiceDate:
          transfers.length > 0
            ? transfers[transfers.length - 1].serviceDate
            : null,

        transfers,
      }),
    );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private validateDateRange(from?: string, to?: string, field = 'Date'): void {
    if (from && to && from > to) {
      throw new BadRequestException(
        `${field} from cannot be later than ${field.toLowerCase()} to`,
      );
    }
  }

  private toDatabaseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toCancunStartOfDay(value: string): Date {
    return new Date(`${value}T00:00:00-05:00`);
  }

  private toCancunStartOfNextDay(value: string): Date {
    const date = this.toDatabaseDate(value);

    date.setUTCDate(date.getUTCDate() + 1);

    return this.toCancunStartOfDay(date.toISOString().slice(0, 10));
  }
}
