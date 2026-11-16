
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import type { ListReservationsDto } from '../dto/list-reservations.dto.js';

const CANCUN_TIME_ZONE = 'America/Cancun';
const CANCUN_UTC_OFFSET = '-05:00';

@Injectable()
export class ReservationListService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // LIST RESERVATIONS
  // =========================================================

  async findAll(query: ListReservationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    // =========================================================
    // VALIDATE DATE RANGE
    // =========================================================

    this.validateDateRange(
      query.createdDateFrom,
      query.createdDateTo,
    );

    // =========================================================
    // RESOLVE CREATION DATE FILTER
    // =========================================================

    const createdAt = this.resolveCreatedAtFilter(
      query.createdDateFrom,
      query.createdDateTo,
      Boolean(search),
    );

    // =========================================================
    // BUILD SEARCH FILTER
    // =========================================================

    const searchFilter = search
      ? this.buildSearchFilter(search)
      : undefined;

    // =========================================================
    // BUILD WHERE
    // =========================================================

    const where: Prisma.ReservationWhereInput = {
      reservationStatusId: query.reservationStatusId,
      createdAt,

      ...(searchFilter
        ? {
            OR: searchFilter,
          }
        : {}),
    };

    // =========================================================
    // QUERY RESERVATIONS
    // =========================================================

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
              transferGroupUuid: true,
              price: true,

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

              vehicle: {
                select: {
                  id: true,
                  name: true,
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

        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],

        skip: (page - 1) * limit,
        take: limit,
      }),

      this.prisma.reservation.count({
        where,
      }),
    ]);

    // =========================================================
    // MAP RESPONSE
    // =========================================================

    const items = reservations.map(
      ({
        reservationCustomer,
        createdBy,
        transfers,
        _count,
        ...reservation
      }) => {
        const transferGroups = new Set(
          transfers.map((transfer) => transfer.transferGroupUuid),
        );

        return {
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
            name: [
              createdBy.firstName,
              createdBy.lastName,
            ]
              .filter(Boolean)
              .join(' '),
          },

          transferCount: _count.transfers,
          transferGroupCount: transferGroups.size,
          paymentCount: _count.payments,
          noteCount: _count.notes,

          firstServiceDate:
            transfers[0]?.serviceDate ?? null,

          lastServiceDate:
            transfers.length > 0
              ? transfers[transfers.length - 1].serviceDate
              : null,

          transfers,
        };
      },
    );

    // =========================================================
    // RESPONSE
    // =========================================================

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

  // =========================================================
  // BUILD SEARCH FILTER
  // =========================================================

  private buildSearchFilter(
    search: string,
  ): Prisma.ReservationWhereInput[] {
    const terms = search.split(/\s+/).filter(Boolean);

    const customerFilters: Prisma.ReservationCustomerWhereInput[] = [
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
    ];

    // Search full names across firstName and lastName.

    if (terms.length > 1) {
      customerFilters.push({
        AND: terms.map((term) => ({
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
      });
    }

    return [
      {
        folio: {
          contains: search,
        },
      },
      {
        reservationCustomer: {
          is: {
            OR: customerFilters,
          },
        },
      },
    ];
  }

  // =========================================================
  // RESOLVE CREATION DATE FILTER
  // =========================================================

  private resolveCreatedAtFilter(
    from?: string,
    to?: string,
    hasSearch = false,
  ): Prisma.DateTimeFilter | undefined {
    // An explicit date takes precedence.

    if (from || to) {
      const startDate = from ?? to!;
      const endDate = to ?? from!;

      return {
        gte: this.toCancunStartOfDay(startDate),
        lt: this.toCancunStartOfNextDay(endDate),
      };
    }

    // A text search without dates searches all history.

    if (hasSearch) {
      return undefined;
    }

    // Default: reservations created today in Cancun.

    const today = this.getCancunToday();

    return {
      gte: this.toCancunStartOfDay(today),
      lt: this.toCancunStartOfNextDay(today),
    };
  }

  // =========================================================
  // VALIDATE DATE RANGE
  // =========================================================

  private validateDateRange(
    from?: string,
    to?: string,
  ): void {
    if (from) {
      this.validateCalendarDate(from);
    }

    if (to) {
      this.validateCalendarDate(to);
    }

    if (from && to && from > to) {
      throw new BadRequestException(
        'Created date from cannot be later than created date to',
      );
    }
  }

  // =========================================================
  // GET TODAY IN CANCUN
  // =========================================================

  private getCancunToday(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CANCUN_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';

    return [
      getPart('year'),
      getPart('month'),
      getPart('day'),
    ].join('-');
  }

  // =========================================================
  // DATABASE DATE UTILITIES
  // =========================================================

  private toCancunStartOfDay(value: string): Date {
    this.validateCalendarDate(value);

    return new Date(
      `${value}T00:00:00${CANCUN_UTC_OFFSET}`,
    );
  }

  private toCancunStartOfNextDay(value: string): Date {
    this.validateCalendarDate(value);

    const date = new Date(`${value}T00:00:00.000Z`);

    date.setUTCDate(date.getUTCDate() + 1);

    const nextDate = date.toISOString().slice(0, 10);

    return this.toCancunStartOfDay(nextDate);
  }

  // =========================================================
  // VALIDATE CALENDAR DATE
  // =========================================================

  private validateCalendarDate(value: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(
        'Invalid creation date format',
      );
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(
        'Invalid creation date',
      );
    }
  }
}
