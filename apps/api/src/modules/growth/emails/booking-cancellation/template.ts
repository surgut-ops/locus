export function renderBookingCancellationTemplate(input: { listingTitle: string }): string {
  return `Your booking for "${input.listingTitle}" has been cancelled.`;
}
