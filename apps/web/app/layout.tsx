import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';

import { ThemeProvider } from '../components/ThemeProvider';
import { defaultLocale, getMessages, isValidLocale, localeCookieName } from '../i18n';
import '../styles/globals.css';

type RootLayoutProps = {
  children: ReactNode;
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ec4899',
};

export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LOCUS',
  },
};

export default async function RootLayout({ children }: RootLayoutProps) {
  let locale = defaultLocale;
  try {
    const headersList = await headers();
    const headerLocale = headersList.get('x-next-intl-locale');
    if (headerLocale && isValidLocale(headerLocale)) locale = headerLocale;
  } catch {
    // Fallback
  }
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(localeCookieName)?.value;
    if (cookieLocale && isValidLocale(cookieLocale)) locale = cookieLocale;
  } catch {
    // Fallback
  }

  const messages = await getMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem('locus-theme');var t='system';if(r){var p=JSON.parse(r);t=p.state&&p.state.theme||'system';}var s=window.matchMedia('(prefers-color-scheme: dark)');var d=t==='dark'||(t==='system'&&s.matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-900 dark:text-slate-100">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
