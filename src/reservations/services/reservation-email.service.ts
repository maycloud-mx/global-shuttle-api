import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EmailService } from '../../email/email.service.js';

import {
  renderReservationQuoteEmail,
  renderReservationQuoteText,
} from '../../email/templates/reservation/reservation-quote.template.js';

import { PrismaService } from '../../prisma/prisma.service.js';

import type { SendQuoteEmailDto } from '../dto/send-quote-email.dto.js';

const QUOTATION_STATUS_CODE = 'QUOTATION';

@Injectable()
export class ReservationEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // =========================================================
  // SEND RESERVATION QUOTE EMAIL
  // =========================================================

  async sendQuoteEmail(id: number, dto: SendQuoteEmailDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },

      select: {
        folio: true,
        total: true,

        currency: {
          select: {
            code: true,
          },
        },

        reservationStatus: {
          select: {
            code: true,
          },
        },

        reservationCustomer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },

        transfers: {
          select: {
            serviceDate: true,
            serviceTime: true,
            pickupDate: true,
            pickupTime: true,
            passengers: true,

            vehicle: {
              select: {
                name: true,
              },
            },

            originTransferPoint: {
              select: {
                name: true,
              },
            },

            destinationTransferPoint: {
              select: {
                name: true,
              },
            },
          },

          orderBy: [{ serviceDate: 'asc' }, { serviceTime: 'asc' }],
        },
      },
    });

    // =========================================================
    // VALIDATE RESERVATION
    // =========================================================

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.reservationStatus.code !== QUOTATION_STATUS_CODE) {
      throw new BadRequestException(
        'Only reservations in quotation status can send a quote email',
      );
    }

    if (!reservation.reservationCustomer) {
      throw new BadRequestException('Reservation customer not found');
    }

    // =========================================================
    // PREPARE EMAIL DATA
    // =========================================================

    const customerName = [
      reservation.reservationCustomer.firstName,
      reservation.reservationCustomer.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    const templateData = {
      folio: reservation.folio,
      customerName,
      currencyCode: reservation.currency.code,
      total: reservation.total.toFixed(2),

      transfers: reservation.transfers.map((transfer) => ({
        origin: transfer.originTransferPoint.name,
        destination: transfer.destinationTransferPoint.name,

        serviceDate: transfer.serviceDate,
        serviceTime: transfer.serviceTime,

        pickupDate: transfer.pickupDate,
        pickupTime: transfer.pickupTime,

        passengers: transfer.passengers,
        vehicle: transfer.vehicle.name,
      })),
    };

    // =========================================================
    // RENDER EMAIL
    // =========================================================

    const html = renderReservationQuoteEmail(templateData);

    const text = renderReservationQuoteText(templateData);

    const email = dto.email.trim().toLowerCase();

    // =========================================================
    // SEND EMAIL
    // =========================================================

    await this.emailService.sendEmail(
      email,
      `Your Global Shuttle quote - ${reservation.folio}`,
      html,
      text,
    );

    // =========================================================
    // RESPONSE
    // =========================================================

    return {
      reservationId: id,
      folio: reservation.folio,
      email,
    };
  }
}
