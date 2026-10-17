
import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import { lookup } from 'node:dns/promises';
import { loadEnvironment } from '../config/environment.js';

interface SmtpError extends Error {
  code?: string;
  command?: string;
  response?: string;
  responseCode?: number;
  timeoutType?: string;
  errno?: string | number;
  syscall?: string;
  hostname?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly smtpHost: string;
  private readonly smtpPort: number;
  private readonly smtpSecure: boolean;
  private readonly smtpUser: string;
  private readonly smtpPassword: string;
  private readonly fromName: string;
  private readonly fromEmail: string;
  private readonly isDevelopment: boolean;

  constructor() {
    const config = loadEnvironment();

    this.fromName = config.SMTP_FROM_NAME;
    this.fromEmail = config.SMTP_FROM_EMAIL;
    this.isDevelopment = config.NODE_ENV === 'development';
    this.smtpHost = config.SMTP_HOST;
    this.smtpPort = config.SMTP_PORT;
    this.smtpSecure = config.SMTP_SECURE;
    this.smtpUser = config.SMTP_USER;
    this.smtpPassword = config.SMTP_PASSWORD;
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    const mailOptions: SendMailOptions = {
      from: {
        name: this.fromName,
        address: this.fromEmail,
      },
      to,
      subject,
      html,
      text,
    };

    try {
      const transporter = await this.createTransporter();
      let result;
      try {
        result = await transporter.sendMail(mailOptions);
      } finally {
        transporter.close();
      }

      this.logger.log(
        `Email sent successfully. Message ID: ${result.messageId}`,
      );
    } catch (error) {
      const smtpError = error as SmtpError;
      const details = {
        name: smtpError.name,
        message: smtpError.message,
        code: smtpError.code,
        command: smtpError.command,
        responseCode: smtpError.responseCode,
        response: smtpError.response,
        timeoutType: smtpError.timeoutType,
        errno: smtpError.errno,
        syscall: smtpError.syscall,
        hostname: smtpError.hostname,
      };

      this.logger.error(
        `Error sending email: ${JSON.stringify(details)}`,
        smtpError.stack,
      );

      throw new BadGatewayException({
        message: 'Email could not be sent',
        ...(this.isDevelopment ? { details } : {}),
      });
    }
  }

  private async createTransporter(): Promise<Transporter> {
    const { address } = await lookup(this.smtpHost, { family: 4 });

    return nodemailer.createTransport({
      host: address,
      port: this.smtpPort,
      secure: this.smtpSecure,
      auth: {
        user: this.smtpUser,
        pass: this.smtpPassword,
      },
      tls: {
        servername: this.smtpHost,
      },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }
}
