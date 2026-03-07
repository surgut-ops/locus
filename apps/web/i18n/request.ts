import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages =
    locale === 'en'
      ? (await import('../locales/en.json')).default
      : (await import('../locales/ru.json')).default;

  return {
    locale,
    messages,
  };
});
