import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';

import { ThemeProvider } from '../components/ThemeProvider';
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
  let locale = 'ru';
  try {
    const headersList = await headers();
    locale = headersList.get('x-next-intl-locale') ?? locale;
  } catch {
    // Fallback if headers unavailable
  }

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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
