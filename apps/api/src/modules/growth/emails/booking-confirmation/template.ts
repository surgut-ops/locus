export function renderBookingConfirmationTemplate(input: {
  listingTitle: string;
  startDate: string;
  endDate: string;
}): string {
  return `Your booking for "${input.listingTitle}" is confirmed from ${input.startDate} to ${input.endDate}.`;
}
