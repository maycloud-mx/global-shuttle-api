
import { Prisma } from '../../generated/prisma/index.js';

// =========================================================
// RESERVATION DETAIL RELATIONS
// =========================================================

export const reservationDetailInclude = {
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

  createdBy: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  },

  businessPartner: {
    select: {
      id: true,
      name: true,
      companyName: true,
      code: true,
      discountPercentage: true,
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

  transfers: {
    include: {
      serviceType: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },

      vehicle: true,

      rate: {
        select: {
          id: true,
          price: true,
        },
      },

      originTransferPoint: true,
      destinationTransferPoint: true,

      transferStatus: {
        select: {
          id: true,
          name: true,
        },
      },

      airline: true,
    },

    orderBy: [
      { serviceDate: 'asc' },
      { serviceTime: 'asc' },
      { id: 'asc' },
    ],
  },

  payments: {
    select: {
      id: true,
      paymentMethod: true,
      provider: true,
      providerStatus: true,
      paymentStatus: true,
      amount: true,
      paymentDate: true,
      expiresAt: true,
      approvedAt: true,
      capturedAt: true,
      cancelledAt: true,
      failedAt: true,
      reference: true,
      receiptFile: true,
      notes: true,
      createdAt: true,
      updatedAt: true,

      currency: {
        select: {
          id: true,
          name: true,
          code: true,
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
    },

    orderBy: {
      createdAt: 'desc',
    },
  },

  notes: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  },
} satisfies Prisma.ReservationInclude;

// =========================================================
// RESERVATION DETAIL TYPE
// =========================================================

export type ReservationDetail = Prisma.ReservationGetPayload<{
  include: typeof reservationDetailInclude;
}>;

// =========================================================
// RESERVATION TRANSFER TYPE
// =========================================================

export type ReservationDetailTransfer =
  ReservationDetail['transfers'][number];

// =========================================================
// RESERVATION TRANSFER GROUP
// =========================================================

export interface ReservationTransferGroupDto {
  uuid: string;

  serviceType: ReservationDetailTransfer['serviceType'];

  vehicle: ReservationDetailTransfer['vehicle'];

  price: Prisma.Decimal;

  transferCount: number;

  transfers: ReservationDetailTransfer[];
}

// =========================================================
// RESERVATION DETAIL RESPONSE
// =========================================================

export interface ReservationDetailResponseDto extends ReservationDetail {
  transferCount: number;

  transferGroupCount: number;

  transferGroups: ReservationTransferGroupDto[];
}
