'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '../i18n/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsDropdown } from './NotificationsDropdown';
import { SearchModal } from './SearchModal';
import { Avatar, Dropdown, Input } from './ui';
import { useAuthStore } from '../store/useAuthStore';
import { useShallow } from 'zustand/react/shallow';

export function Header() {
  const t = useTranslations();
  const [city, setCity] = useState('');
  const [elevated, setElevated] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const { user, isAuthenticated, checkSession, logout } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      checkSession: state.checkSession,
      logout: state.logout,
    })),
  );

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  function handleLogout() {
    logout();
  }

  return (
    <>
      <motion.header
        animate={{
          boxShadow: elevated ? '0 10px 30px -22px rgba(15, 23, 42, 0.5)' : '0 0 0 rgba(0, 0, 0, 0)',
        }}
        className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6">
          <Link href="/" className="text-xl font-bold text-pink-600 shrink-0">
            LOCUS
          </Link>

          <form action="/search" className="hidden flex-1 md:block">
            <Input
              name="city"
              value={city}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
              placeholder={t('search_city_header_placeholder')}
            />
          </form>

          <div className="flex flex-1 justify-end gap-2 md:flex-initial md:gap-4">
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 md:hidden"
              aria-label={t('search')}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <ThemeToggle />
            <LanguageSwitcher />

            {isAuthenticated && <NotificationsDropdown />}

            {!isAuthenticated ? (
              <Link
                href="/auth/login"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 active:bg-slate-800 md:min-h-0 md:min-w-0"
              >
                <span className="hidden md:inline">{t('login')}</span>
                <svg className="h-6 w-6 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            ) : (
              <Dropdown
                trigger={
                  <div className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 md:min-h-0 md:min-w-0">
                    <Avatar name={user?.name ?? 'User'} src={user?.avatar} />
                    <span className="hidden text-sm text-slate-700 dark:text-slate-300 md:inline">
                      {user?.name ?? 'User'}
                    </span>
                  </div>
                }
              >
            <Link
              href="/dashboard"
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {t('dashboard')}
            </Link>
            <Link
              href="/profile"
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {t('profile')}
            </Link>
            <Link
              href="/messages"
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {t('messages')}
            </Link>
            <Link
              href="/search"
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {t('search')}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {t('logout')}
            </button>
          </Dropdown>
            )}
          </div>
        </div>
      </motion.header>
      <SearchModal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </>
  );
}
