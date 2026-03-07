import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { HomePageContent } from '../components/HomePageContent';
import { defaultLocale, getMessages, isValidLocale, localeCookieName } from '../i18n';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(localeCookieName)?.value;
  const locale = isValidLocale(localeCookie) ? localeCookie : defaultLocale;
  const messages = await getMessages(locale);

  return {
    title: 'LOCUS - Modern Real Estate Platform',
    description: messages.hero_subtitle,
  };
}

export default function HomePage() {
  return <HomePageContent />;
}
