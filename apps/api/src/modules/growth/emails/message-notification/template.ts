export function renderMessageNotificationTemplate(input: { senderName: string; preview: string }): string {
  return `New message from ${input.senderName}: "${input.preview}"`;
}
