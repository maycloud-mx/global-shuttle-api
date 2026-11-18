import { BadRequestException, Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import type { ListLogisticsTransfersDto } from '../dto/list-logistics-transfers.dto.js';

const CANCUN_TIME_ZONE = 'America/Cancun';

const ALLOWED_RESERVATION_STATUSES = ['QUOTATION', 'CONFIRMED'];

@Injectable()
export class LogisticsListService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // LIST LOGISTICS TRANSFERS
  // =========================================================

  async findAll(query: ListLogisticsTransfersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    // =========================================================
    // RESOLVE PICKUP DATE FILTER
    // =========================================================

    const { dateFrom, dateTo } = this.resolveDateFilter(query);

    const pickupDate: Prisma.DateTimeFilter = {
      gte: this.toDatabaseDate(dateFrom),
      lte: this.toDatabaseDate(dateTo),
    };

    // =========================================================
    // RESOLVE ASSIGNMENT FILTER
    // =========================================================

    const assignmentFilter = this.buildAssignmentFilter(query.assigned);

    // =========================================================
    // BUILD WHERE
    // =========================================================

    const filters: Prisma.ReservationTransferWhereInput[] = [
      // =====================================================
      // PICKUP DATE
      // =====================================================

      {
        pickupDate,
      },

      // =====================================================
      // ALLOWED RESERVATION STATUSES
      // =====================================================

      {
        reservation: {
          reservationStatus: {
            code: {
              in: ALLOWED_RESERVATION_STATUSES,
            },
          },
        },
      },
    ];

    // =========================================================
    // SEARCH FILTER
    // =========================================================

    if (search) {
      filters.push({
        OR: this.buildSearchFilter(search),
      });
    }

    // =========================================================
    // ASSIGNMENT FILTER
    // =========================================================

    if (assignmentFilter) {
      filters.push(assignmentFilter);
    }

    // =========================================================
    // FINAL WHERE
    // =========================================================

    const where: Prisma.ReservationTransferWhereInput = {
      AND: filters,
    };

    // =========================================================
    // GET TRANSFERS AND COUNTS
    // =========================================================

    const [transfers, total, assignmentGroups] = await this.prisma.$transaction(
      [
        // =====================================================
        // LIST TRANSFERS
        // =====================================================

        this.prisma.reservationTransfer.findMany({
          where,

          select: {
            id: true,
            reservationId: true,
            transferGroupUuid: true,

            segmentLeg: true,
            segmentType: true,

            serviceDate: true,
            serviceTime: true,

            pickupDate: true,
            pickupTime: true,

            passengers: true,
            luggage: true,

            flightNumber: true,

            operatorName: true,
            unitName: true,

            createdAt: true,
            updatedAt: true,

            // =================================================
            // RESERVATION
            // =================================================

            reservation: {
              select: {
                id: true,
                folio: true,

                source: true,
                paymentStatus: true,

                businessPartnerCode: true,

                reservationStatus: {
                  select: {
                    id: true,
                    name: true,
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
              },
            },

            // =================================================
            // SERVICE TYPE
            // =================================================

            serviceType: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },

            // =================================================
            // CONTRACTED VEHICLE
            // =================================================

            vehicle: {
              select: {
                id: true,
                name: true,
              },
            },

            // =================================================
            // ORIGIN TRANSFER POINT
            // =================================================

            originTransferPoint: {
              select: {
                id: true,
                name: true,
                type: true,

                zone: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },

            // =================================================
            // DESTINATION TRANSFER POINT
            // =================================================

            destinationTransferPoint: {
              select: {
                id: true,
                name: true,
                type: true,

                zone: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },

            // =================================================
            // AIRLINE
            // =================================================

            airline: {
              select: {
                id: true,
                name: true,
                iataCode: true,
                icaoCode: true,
              },
            },

            // =================================================
            // TRANSFER STATUS
            // =================================================

            transferStatus: {
              select: {
                id: true,
                name: true,
              },
            },
          },

          // =================================================
          // ORDER BY PICKUP DATE AND TIME
          // =================================================

          orderBy: [
            { pickupDate: 'asc' },
            { pickupTime: 'asc' },
            { id: 'asc' },
          ],

          // =================================================
          // PAGINATION
          // =================================================

          skip: (page - 1) * limit,
          take: limit,
        }),

        // =====================================================
        // TOTAL MATCHING TRANSFERS
        // =====================================================

        this.prisma.reservationTransfer.count({
          where,
        }),

        // =====================================================
        // ASSIGNMENT STATISTICS
        // =====================================================

        this.prisma.reservationTransfer.groupBy({
          by: ['operatorName', 'unitName'],

          where,

          _count: {
            _all: true,
          },
        }),
      ],
    );

    // =========================================================
    // CALCULATE ASSIGNMENT SUMMARY
    // =========================================================

    let assigned = 0;
    let partiallyAssigned = 0;
    let unassigned = 0;

    for (const group of assignmentGroups) {
      const count = group._count._all;

      const hasOperator = Boolean(group.operatorName?.trim());

      const hasUnit = Boolean(group.unitName?.trim());

      if (hasOperator && hasUnit) {
        assigned += count;
      } else if (hasOperator || hasUnit) {
        partiallyAssigned += count;
      } else {
        unassigned += count;
      }
    }

    // =========================================================
    // MAP RESPONSE
    // =========================================================

    const items = transfers.map((transfer) => {
      const { reservation, ...transferData } = transfer;

      const customer = reservation.reservationCustomer;

      // =====================================================
      // RESOLVE ASSIGNMENT STATUS
      // =====================================================

      const hasOperator = Boolean(transfer.operatorName?.trim());

      const hasUnit = Boolean(transfer.unitName?.trim());

      const assignmentStatus =
        hasOperator && hasUnit
          ? 'ASSIGNED'
          : hasOperator || hasUnit
            ? 'PARTIALLY_ASSIGNED'
            : 'UNASSIGNED';

      return {
        ...transferData,

        // =====================================================
        // FORMAT DATES AND TIMES
        // =====================================================

        serviceDate: this.formatDate(transfer.serviceDate),

        serviceTime: this.formatTime(transfer.serviceTime),

        pickupDate: this.formatDate(transfer.pickupDate),

        pickupTime: this.formatTime(transfer.pickupTime),

        // =====================================================
        // RESERVATION INFORMATION
        // =====================================================

        reservation: {
          id: reservation.id,
          folio: reservation.folio,

          source: reservation.source,
          paymentStatus: reservation.paymentStatus,

          businessPartnerCode: reservation.businessPartnerCode,

          status: reservation.reservationStatus,
        },

        // =====================================================
        // CUSTOMER INFORMATION
        // =====================================================

        customer: customer
          ? {
              id: customer.id,

              name: [customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(' '),

              email: customer.email,
              phone: customer.phone,

              country: customer.country,
            }
          : null,

        // =====================================================
        // OPERATIONAL ASSIGNMENT
        // =====================================================

        assignment: {
          operatorName: transfer.operatorName,
          unitName: transfer.unitName,
          status: assignmentStatus,
        },
      };
    });

    // =========================================================
    // RESPONSE
    // =========================================================

    return {
      filters: {
        dateFrom,
        dateTo,

        search: search || null,

        assigned: query.assigned ?? null,
      },

      summary: {
        total,
        assigned,
        partiallyAssigned,
        unassigned,
      },

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
  // BUILD ASSIGNMENT FILTER
  // =========================================================

  private buildAssignmentFilter(
    assigned?: boolean,
  ): Prisma.ReservationTransferWhereInput | null {
    // =========================================================
    // ALL TRANSFERS
    // =========================================================

    if (assigned === undefined) {
      return null;
    }

    // =========================================================
    // FULLY ASSIGNED TRANSFERS
    // =========================================================

    if (assigned === true) {
      return {
        AND: [
          {
            operatorName: {
              not: null,
            },
          },
          {
            operatorName: {
              not: '',
            },
          },
          {
            unitName: {
              not: null,
            },
          },
          {
            unitName: {
              not: '',
            },
          },
        ],
      };
    }

    // =========================================================
    // NOT FULLY ASSIGNED TRANSFERS
    // =========================================================

    return {
      OR: [
        {
          operatorName: null,
        },
        {
          operatorName: '',
        },
        {
          unitName: null,
        },
        {
          unitName: '',
        },
      ],
    };
  }

  // =========================================================
  // RESOLVE DATE FILTER
  // =========================================================

  private resolveDateFilter(query: ListLogisticsTransfersDto): {
    dateFrom: string;
    dateTo: string;
  } {
    const hasDateRange =
      query.dateFrom !== undefined || query.dateTo !== undefined;

    // =========================================================
    // PREVENT MIXED DATE FILTERS
    // =========================================================

    if (query.date && hasDateRange) {
      throw new BadRequestException(
        'Use either date or dateFrom/dateTo, not both',
      );
    }

    // =========================================================
    // VALIDATE DATE VALUES
    // =========================================================

    const dates = [query.date, query.dateFrom, query.dateTo];

    for (const value of dates) {
      if (value !== undefined) {
        this.toDatabaseDate(value);
      }
    }

    // =========================================================
    // VALIDATE DATE RANGE
    // =========================================================

    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('Date from cannot be later than date to');
    }

    // =========================================================
    // DEFAULT TO TODAY IN CANCUN
    // =========================================================

    const today = this.getCancunToday();

    // =========================================================
    // RESOLVE DATE FROM
    // =========================================================

    const dateFrom = hasDateRange
      ? (query.dateFrom ?? query.dateTo!)
      : (query.date ?? today);

    // =========================================================
    // RESOLVE DATE TO
    // =========================================================

    const dateTo = hasDateRange
      ? (query.dateTo ?? query.dateFrom!)
      : (query.date ?? today);

    return {
      dateFrom,
      dateTo,
    };
  }

  // =========================================================
  // BUILD SEARCH FILTER
  // =========================================================

  private buildSearchFilter(
    search: string,
  ): Prisma.ReservationTransferWhereInput[] {
    const terms = search.split(/\s+/).filter(Boolean);

    // =========================================================
    // CUSTOMER FILTERS
    // =========================================================

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

    // =========================================================
    // SEARCH FULL CUSTOMER NAMES
    // =========================================================

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

    // =========================================================
    // SEARCH BY RESERVATION AND CUSTOMER
    // =========================================================

    return [
      // =====================================================
      // RESERVATION FOLIO
      // =====================================================

      {
        reservation: {
          folio: {
            contains: search,
          },
        },
      },

      // =====================================================
      // CUSTOMER NAME OR EMAIL
      // =====================================================

      {
        reservation: {
          reservationCustomer: {
            is: {
              OR: customerFilters,
            },
          },
        },
      },
    ];
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

    return [getPart('year'), getPart('month'), getPart('day')].join('-');
  }

  // =========================================================
  // DATABASE DATE UTILITY
  // =========================================================

  private toDatabaseDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Date must have the format YYYY-MM-DD');
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException('Invalid pickup date');
    }

    return date;
  }

  // =========================================================
  // FORMAT DATABASE DATE
  // =========================================================

  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  // =========================================================
  // FORMAT DATABASE TIME
  // =========================================================

  private formatTime(value: Date): string {
    return value.toISOString().slice(11, 19);
  }
}
