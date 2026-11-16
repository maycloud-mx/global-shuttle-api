import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ReservationDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },

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

          orderBy: [{ serviceDate: 'asc' }, { serviceTime: 'asc' }],
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
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return reservation;
  }
}
