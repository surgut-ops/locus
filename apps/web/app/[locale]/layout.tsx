import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';

import { Header } from '../../components/Header';
import { PageTransition } from '../../components/PageTransition';
import { InstallPrompt } from '../../components/InstallPrompt';
import { MobileBottomNav } from '../../components/MobileBottomNav';
import { routing } from '../../i18n/routing';

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Header />
      <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-7xl px-4 py-6 pb-20 md:pb-6">
        <PageTransition>{children}</PageTransition>
      </main>
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 text-sm text-slate-600 dark:text-slate-400">
          <p>LOCUS - AI real estate platform</p>
          <p>Airbnb-grade architecture in progress</p>
        </div>
      </footer>
      <MobileBottomNav />
      <InstallPrompt />
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
