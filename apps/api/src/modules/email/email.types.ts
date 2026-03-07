/** Email template identifiers */
export type EmailTemplate =
  | 'welcome'
  | 'booking_confirmation'
  | 'payment_confirmation'
  | 'new_message';

/** Base payload for all email jobs */
export type EmailJobPayload = {
  template: EmailTemplate;
  to: string;
  subject: string;
  data: Record<string, unknown>;
};

/** Welcome email data */
export type WelcomeEmailData = {
  name: string;
};

/** Booking confirmation email data */
export type BookingConfirmationEmailData = {
  guestName: string;
  listingTitle: string;
  startDate: string;
  endDate: string;
  totalPrice: string;
  currency: string;
};

/** Payment confirmation email data */
export type PaymentConfirmationEmailData = {
  guestName: string;
  amount: string;
  currency: string;
  listingTitle?: string;
};

/** New message notification email data */
export type NewMessageEmailData = {
  recipientName: string;
  senderName: string;
  preview: string;
};
