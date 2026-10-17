
import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import { loadEnvironment } from '../config/environment.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly fromName: string;
  private readonly fromEmail: string;

  constructor() {
    const config = loadEnvironment();

    this.fromName = config.SMTP_FROM_NAME;
    this.fromEmail = config.SMTP_FROM_EMAIL;

    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const mailOptions: SendMailOptions = {
      from: {
        name: this.fromName,
        address: this.fromEmail,
      },
      to,
      subject,
      html,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Email sent successfully. Message ID: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        'Error sending email',
        error instanceof Error ? error.stack : String(error),
      );

      throw new BadGatewayException('Email could not be sent');
    }
  }
}
