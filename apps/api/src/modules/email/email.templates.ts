import type {
  BookingConfirmationEmailData,
  NewMessageEmailData,
  PaymentConfirmationEmailData,
  WelcomeEmailData,
} from './email.types.js';

const BASE_STYLES =
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto;";

const HEADER_STYLES =
  'background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; font-size: 24px; font-weight: 700;';

const BODY_STYLES =
  'padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;';

const FOOTER_STYLES = 'padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderWelcomeEmail(data: WelcomeEmailData): string {
  const name = data.name || 'Пользователь';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Добро пожаловать в LOCUS</title></head>
<body style="${BASE_STYLES}">
  <div style="${HEADER_STYLES}">LOCUS</div>
  <div style="${BODY_STYLES}">
    <h2 style="margin-top: 0;">Добро пожаловать, ${escapeHtml(name)}!</h2>
    <p>Спасибо за регистрацию на платформе LOCUS — аренды жилья для путешественников.</p>
    <p>Теперь вы можете:</p>
    <ul>
      <li>Искать и бронировать жильё по всему миру</li>
      <li>Общаться с хозяевами напрямую</li>
      <li>Оставлять отзывы после поездок</li>
    </ul>
    <p>Приятного путешествия!</p>
  </div>
  <div style="${FOOTER_STYLES}">© LOCUS. Все права защищены.</div>
</body>
</html>`;
}

export function renderBookingConfirmationEmail(data: BookingConfirmationEmailData): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Подтверждение бронирования</title></head>
<body style="${BASE_STYLES}">
  <div style="${HEADER_STYLES}">Подтверждение бронирования</div>
  <div style="${BODY_STYLES}">
    <h2 style="margin-top: 0;">Здравствуйте, ${escapeHtml(data.guestName)}!</h2>
    <p>Ваше бронирование успешно создано.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Объект:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.listingTitle)}</td></tr>
      <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Даты:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.startDate)} — ${escapeHtml(data.endDate)}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Сумма:</strong></td><td style="padding: 8px 0;">${escapeHtml(data.totalPrice)} ${escapeHtml(data.currency)}</td></tr>
    </table>
    <p>Ожидайте подтверждения от хозяина.</p>
  </div>
  <div style="${FOOTER_STYLES}">© LOCUS. Все права защищены.</div>
</body>
</html>`;
}

export function renderPaymentConfirmationEmail(data: PaymentConfirmationEmailData): string {
  const listingRow = data.listingTitle
    ? `<p><strong>Объект:</strong> ${escapeHtml(data.listingTitle)}</p>`
    : '';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Оплата прошла успешно</title></head>
<body style="${BASE_STYLES}">
  <div style="${HEADER_STYLES}">Оплата подтверждена</div>
  <div style="${BODY_STYLES}">
    <h2 style="margin-top: 0;">Здравствуйте, ${escapeHtml(data.guestName)}!</h2>
    <p>Ваша оплата успешно выполнена.</p>
    <p><strong>Сумма:</strong> ${escapeHtml(data.amount)} ${escapeHtml(data.currency)}</p>
    ${listingRow}
    <p>Бронирование подтверждено. Приятной поездки!</p>
  </div>
  <div style="${FOOTER_STYLES}">© LOCUS. Все права защищены.</div>
</body>
</html>`;
}

export function renderNewMessageEmail(data: NewMessageEmailData): string {
  const preview =
    data.preview && data.preview.length > 100 ? data.preview.slice(0, 100) + '...' : data.preview || '';
  const blockquote = preview
    ? `<blockquote style="border-left: 4px solid #0f172a; padding-left: 16px; margin: 16px 0; color: #64748b;">${escapeHtml(preview)}</blockquote>`
    : '';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Новое сообщение</title></head>
<body style="${BASE_STYLES}">
  <div style="${HEADER_STYLES}">Новое сообщение</div>
  <div style="${BODY_STYLES}">
    <h2 style="margin-top: 0;">Здравствуйте, ${escapeHtml(data.recipientName)}!</h2>
    <p><strong>${escapeHtml(data.senderName)}</strong> отправил вам сообщение:</p>
    ${blockquote}
    <p>Войдите в аккаунт LOCUS, чтобы ответить.</p>
  </div>
  <div style="${FOOTER_STYLES}">© LOCUS. Все права защищены.</div>
</body>
</html>`;
}
