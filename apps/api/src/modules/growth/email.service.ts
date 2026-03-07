import { getQueueService } from '../infrastructure/queue/queue.service.js';
import { renderBookingCancellationTemplate } from './emails/booking-cancellation/template.js';
import { renderBookingConfirmationTemplate } from './emails/booking-confirmation/template.js';
import { renderMessageNotificationTemplate } from './emails/message-notification/template.js';
import { renderReferralInviteTemplate } from './emails/referral-invite/template.js';

export class EmailService {
  public async sendBookingConfirmation(input: { userId: string; listingTitle: string; startDate: string; endDate: string }) {
    return this.enqueueEmail({
      userId: input.userId,
      title: 'Booking confirmation',
      body: renderBookingConfirmationTemplate(input),
    });
  }

  public async sendBookingCancellation(input: { userId: string; listingTitle: string }) {
    return this.enqueueEmail({
      userId: input.userId,
      title: 'Booking cancellation',
      body: renderBookingCancellationTemplate(input),
    });
  }

  public async sendMessageNotification(input: { userId: string; senderName: string; preview: string }) {
    return this.enqueueEmail({
      userId: input.userId,
      title: 'New message',
      body: renderMessageNotificationTemplate(input),
    });
  }

  public async sendReferralInvite(input: { userId: string; referrerName: string; referralLink: string }) {
    return this.enqueueEmail({
      userId: input.userId,
      title: 'Referral invite',
      body: renderReferralInviteTemplate(input),
    });
  }

  public async sendAccountVerification(input: { userId: string; verificationLink: string }) {
    return this.enqueueEmail({
      userId: input.userId,
      title: 'Verify your account',
      body: `Verify your LOCUS account using this link: ${input.verificationLink}`,
    });
  }

  private async enqueueEmail(input: { userId: string; title: string; body: string }) {
    const queueService = getQueueService();
    if (!queueService) {
      return { queued: false };
    }
    await queueService.addNotificationJob({
      type: 'system',
      userId: input.userId,
      title: input.title,
      body: input.body,
    });
    return { queued: true };
  }
}
