import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import type { AssignLogisticsTransferDto } from '../dto/assign-logistics-transfer.dto.js';

const ALLOWED_RESERVATION_STATUSES = ['QUOTATION', 'CONFIRMED'];

@Injectable()
export class LogisticsAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // ASSIGN OPERATOR AND UNIT
  // =========================================================

  async assign(transferId: number, dto: AssignLogisticsTransferDto) {
    // =========================================================
    // VALIDATE REQUEST
    // =========================================================

    if (dto.operatorName === undefined && dto.unitName === undefined) {
      throw new BadRequestException(
        'At least one assignment field must be provided',
      );
    }

    // =========================================================
    // NORMALIZE VALUES
    // =========================================================

    const operatorName =
      dto.operatorName === undefined
        ? undefined
        : dto.operatorName?.trim() || null;

    const unitName =
      dto.unitName === undefined ? undefined : dto.unitName?.trim() || null;

    // =========================================================
    // UPDATE ASSIGNMENT
    // =========================================================

    return this.prisma.$transaction(
      async (tx) => {
        // =====================================================
        // FIND TRANSFER
        // =====================================================

        const current = await tx.reservationTransfer.findUnique({
          where: {
            id: transferId,
          },

          select: {
            id: true,
            reservationId: true,

            operatorName: true,
            unitName: true,

            reservation: {
              select: {
                id: true,
                folio: true,

                reservationStatus: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        });

        if (!current) {
          throw new NotFoundException('Logistics transfer not found');
        }

        // =====================================================
        // VALIDATE RESERVATION STATUS
        // =====================================================

        if (
          !ALLOWED_RESERVATION_STATUSES.includes(
            current.reservation.reservationStatus.code,
          )
        ) {
          throw new BadRequestException(
            'Only quoted or confirmed reservations can receive assignments',
          );
        }

        // =====================================================
        // UPDATE SPECIFIC TRANSFER
        // =====================================================

        const result = await tx.reservationTransfer.updateMany({
          where: {
            id: transferId,

            reservation: {
              reservationStatus: {
                code: {
                  in: ALLOWED_RESERVATION_STATUSES,
                },
              },
            },
          },

          data: {
            operatorName,
            unitName,
          },
        });

        if (result.count !== 1) {
          throw new BadRequestException(
            'Transfer assignment is no longer allowed',
          );
        }

        // =====================================================
        // GET UPDATED TRANSFER
        // =====================================================

        const updated = await tx.reservationTransfer.findUniqueOrThrow({
          where: {
            id: transferId,
          },

          select: {
            id: true,
            reservationId: true,
            transferGroupUuid: true,

            serviceDate: true,
            serviceTime: true,

            pickupDate: true,
            pickupTime: true,

            operatorName: true,
            unitName: true,

            updatedAt: true,

            reservation: {
              select: {
                id: true,
                folio: true,

                reservationStatus: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },

            transferStatus: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // =====================================================
        // CALCULATE ASSIGNMENT STATUS
        // =====================================================

        const hasOperator = Boolean(updated.operatorName?.trim());

        const hasUnit = Boolean(updated.unitName?.trim());

        const assignmentStatus =
          hasOperator && hasUnit
            ? 'ASSIGNED'
            : hasOperator || hasUnit
              ? 'PARTIALLY_ASSIGNED'
              : 'UNASSIGNED';

        // =====================================================
        // RESPONSE
        // =====================================================

        return {
          id: updated.id,
          reservationId: updated.reservationId,

          transferGroupUuid: updated.transferGroupUuid,

          serviceDate: updated.serviceDate,
          serviceTime: updated.serviceTime,

          pickupDate: updated.pickupDate,
          pickupTime: updated.pickupTime,

          reservation: {
            id: updated.reservation.id,
            folio: updated.reservation.folio,
            status: updated.reservation.reservationStatus,
          },

          transferStatus: updated.transferStatus,

          assignment: {
            operatorName: updated.operatorName,
            unitName: updated.unitName,
            status: assignmentStatus,
          },

          updatedAt: updated.updatedAt,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
