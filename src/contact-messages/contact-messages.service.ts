import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TurnstileService } from '../auth/turnstile.service.js';
import { loadEnvironment } from '../config/environment.js';
import {
  CONTACT_CONFIRMATION_EN_SUBJECT,
  renderContactConfirmationEmailEn,
  renderContactConfirmationTextEn,
} from '../email/contact-confirmation.en.template.js';
import {
  CONTACT_CONFIRMATION_SUBJECT,
  renderContactConfirmationEmail,
  renderContactConfirmationText,
} from '../email/contact-confirmation.template.js';
import {
  CONTACT_NOTIFICATION_EN_SUBJECT,
  renderContactNotificationEmailEn,
  renderContactNotificationTextEn,
} from '../email/contact-notification.en.template.js';
import {
  CONTACT_NOTIFICATION_SUBJECT,
  renderContactNotificationEmail,
  renderContactNotificationText,
} from '../email/contact-notification.template.js';
import { EmailService } from '../email/email.service.js';
import type { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateContactMessageDto } from './dto/create-contact-message.dto.js';
import type { ListContactMessagesDto } from './dto/list-contact-messages.dto.js';

const CANCUN_UTC_OFFSET = '-05:00';

@Injectable()
export class ContactMessagesService {
  private readonly logger = new Logger(ContactMessagesService.name);
  private readonly adminEmail = loadEnvironment().SMTP_FROM_EMAIL;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly turnstile: TurnstileService,
  ) {}

  async create(dto: CreateContactMessageDto, remoteIp?: string) {
    await this.turnstile.verify(dto.turnstileToken, {
      expectedAction: 'contact_submit',
      expectedHostname: 'globalshuttlecancun.com',
      remoteIp,
    });

    const message = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone || null,
        comment: dto.comment,
      },
    });

    const isEnglish = dto.language === 'en';

    await Promise.all([
      this.sendAndRecord(message.id, 'customerEmailSentAt', () =>
        this.emailService.sendEmail(
          message.email,
          isEnglish
            ? CONTACT_CONFIRMATION_EN_SUBJECT
            : CONTACT_CONFIRMATION_SUBJECT,
          isEnglish
            ? renderContactConfirmationEmailEn(message)
            : renderContactConfirmationEmail(message),
          isEnglish
            ? renderContactConfirmationTextEn(message)
            : renderContactConfirmationText(message),
        ),
      ),
      this.sendAndRecord(message.id, 'adminEmailSentAt', () =>
        this.emailService.sendEmail(
          this.adminEmail,
          isEnglish
            ? CONTACT_NOTIFICATION_EN_SUBJECT
            : CONTACT_NOTIFICATION_SUBJECT,
          isEnglish
            ? renderContactNotificationEmailEn(message)
            : renderContactNotificationEmail(message),
          isEnglish
            ? renderContactNotificationTextEn(message)
            : renderContactNotificationText(message),
          message.email,
        ),
      ),
    ]);

    return { id: message.id };
  }

  private async sendAndRecord(
    id: number,
    timestamp: 'customerEmailSentAt' | 'adminEmailSentAt',
    send: () => Promise<void>,
  ) {
    try {
      await send();
    } catch {
      this.logger.warn(`Contact message #${id}: email failed for ${timestamp}`);
      return;
    }

    try {
      await this.prisma.contactMessage.update({
        where: { id },
        data: { [timestamp]: new Date() },
      });
    } catch {
      this.logger.error(`Contact message #${id}: could not save ${timestamp}`);
    }
  }

  async findAll({
    dateFrom,
    dateTo,
    isRead,
    page,
    limit,
  }: ListContactMessagesDto) {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException('dateFrom must be on or before dateTo');
    }

    const where: Prisma.ContactMessageWhereInput = {
      isRead,
      createdAt: {
        gte: dateFrom
          ? new Date(`${dateFrom}T00:00:00.000${CANCUN_UTC_OFFSET}`)
          : undefined,
        lte: dateTo
          ? new Date(`${dateTo}T23:59:59.999${CANCUN_UTC_OFFSET}`)
          : undefined,
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async markRead(id: number) {
    if (!Number.isInteger(id) || id < 1 || id > 0xffffffff) {
      throw new BadRequestException('Invalid contact message ID');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.contactMessage.updateMany({
        where: { id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      const message = await transaction.contactMessage.findUnique({
        where: { id },
      });
      if (!message) {
        throw new NotFoundException('Contact message not found');
      }
      return message;
    });
  }
}
