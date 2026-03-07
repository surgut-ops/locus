import nodemailer from 'nodemailer';

import { LoggerService } from '../infrastructure/logging/logger.service.js';
import type {
  BookingConfirmationEmailData,
  EmailJobPayload,
  NewMessageEmailData,
  PaymentConfirmationEmailData,
  WelcomeEmailData,
} from './email.types.js';
import {
  renderBookingConfirmationEmail,
  renderNewMessageEmail,
  renderPaymentConfirmationEmail,
  renderWelcomeEmail,
} from './email.templates.js';

/**
 * SMTP configuration via environment variables:
 * - SMTP_HOST
 * - SMTP_PORT (default: 587)
 * - SMTP_USER
 * - SMTP_PASSWORD
 */
export class EmailService {
  private readonly transporter: ReturnType<typeof nodemailer.createTransport> | null;
  private readonly logger = new LoggerService('email');
  private readonly from: string;

  public constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;

    if (host && user && password) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: password },
      });
      this.from = process.env.SMTP_FROM ?? `LOCUS <${user}>`;
      this.logger.info('SMTP configured', { host, port });
    } else {
      this.transporter = null;
      this.from = 'LOCUS <noreply@locus.example>';
      this.logger.warn('SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASSWORD required)');
    }
  }

  public async sendEmail(payload: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ sent: boolean; error?: string }> {
    if (!this.transporter) {
      this.logger.debug('Email skipped (no SMTP)', { to: payload.to, subject: payload.subject });
      return { sent: false };
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text ?? payload.html.replace(/<[^>]+>/g, ''),
      });
      this.logger.info('Email sent', { to: payload.to, subject: payload.subject });
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Email send failed', { to: payload.to, error: message });
      return { sent: false, error: message };
    }
  }

  public renderAndSend(payload: EmailJobPayload): Promise<{ sent: boolean; error?: string }> {
    const { template, to, subject, data } = payload;
    let html: string;

    switch (template) {
      case 'welcome':
        html = renderWelcomeEmail(data as WelcomeEmailData);
        break;
      case 'booking_confirmation':
        html = renderBookingConfirmationEmail(data as BookingConfirmationEmailData);
        break;
      case 'payment_confirmation':
        html = renderPaymentConfirmationEmail(data as PaymentConfirmationEmailData);
        break;
      case 'new_message':
        html = renderNewMessageEmail(data as NewMessageEmailData);
        break;
      default:
        this.logger.warn('Unknown email template', { template });
        return Promise.resolve({ sent: false, error: `Unknown template: ${template}` });
    }

    return this.sendEmail({ to, subject, html });
  }

  public isConfigured(): boolean {
    return this.transporter !== null;
  }
}
