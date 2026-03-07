export const locales = ['ru', 'en'] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'ru';
export const localeCookieName = 'locus_locale';

export function isValidLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && locales.includes(value as AppLocale));
}

export function getLocaleFromPath(pathname: string): AppLocale | null {
  const first = pathname.split('/').filter(Boolean)[0];
  return isValidLocale(first) ? first : null;
}

export function withLocalePrefix(pathname: string, locale: AppLocale): string {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const current = getLocaleFromPath(normalized);

  if (current) {
    return normalized.replace(`/${current}`, `/${locale}`) || `/${locale}`;
  }
  return `/${locale}${normalized === '/' ? '' : normalized}`;
}

export async function getMessages(locale: AppLocale): Promise<Record<string, string>> {
  if (locale === 'en') {
    const messages = await import('./locales/en.json');
    return messages.default;
  }
  const messages = await import('./locales/ru.json');
  return messages.default;
}
