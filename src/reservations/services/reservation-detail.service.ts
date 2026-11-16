import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import {
  reservationDetailInclude,
  type ReservationDetailResponseDto,
  type ReservationDetailTransfer,
  type ReservationTransferGroupDto,
} from '../dto/reservation-detail.dto.js';

@Injectable()
export class ReservationDetailService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // GET RESERVATION DETAIL
  // =========================================================

  async findOne(id: number): Promise<ReservationDetailResponseDto> {
    // =========================================================
    // LOAD RESERVATION
    // =========================================================

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: reservationDetailInclude,
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // =========================================================
    // GROUP RESERVATION TRANSFERS
    // =========================================================

    const transferGroups = this.groupTransfers(reservation.transfers);

    // =========================================================
    // RESPONSE
    // =========================================================

    return {
      ...reservation,

      transferCount: reservation.transfers.length,
      transferGroupCount: transferGroups.length,

      transferGroups,
    };
  }

  // =========================================================
  // GROUP RESERVATION TRANSFERS
  // =========================================================

  private groupTransfers(
    transfers: ReservationDetailTransfer[],
  ): ReservationTransferGroupDto[] {
    const groups = new Map<string, ReservationDetailTransfer[]>();

    // =========================================================
    // GROUP BY UUID
    // =========================================================

    for (const transfer of transfers) {
      const uuid = transfer.transferGroupUuid;

      const group = groups.get(uuid) ?? [];

      group.push(transfer);

      groups.set(uuid, group);
    }

    // =========================================================
    // BUILD GROUP RESPONSE
    // =========================================================

    const result: ReservationTransferGroupDto[] = [];

    for (const [uuid, groupTransfers] of groups.entries()) {
      // The first created transfer represents outbound.
      // The second, when present, represents return.

      const orderedTransfers = [...groupTransfers].sort((a, b) => a.id - b.id);

      const firstTransfer = orderedTransfers[0];

      // Calculate the contracted price of the complete group.

      const price = orderedTransfers.reduce(
        (total, transfer) => total.plus(transfer.price),
        new Prisma.Decimal(0),
      );

      result.push({
        uuid,

        serviceType: firstTransfer.serviceType,
        vehicle: firstTransfer.vehicle,

        price,

        transferCount: orderedTransfers.length,

        transfers: orderedTransfers,
      });
    }

    // =========================================================
    // ORDER GROUPS BY FIRST SERVICE DATE
    // =========================================================

    result.sort((a, b) => {
      const firstA = a.transfers[0];
      const firstB = b.transfers[0];

      const dateA = firstA.serviceDate.getTime();
      const dateB = firstB.serviceDate.getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      const timeA = firstA.serviceTime.getTime();
      const timeB = firstB.serviceTime.getTime();

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      return firstA.id - firstB.id;
    });

    return result;
  }
}
