'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '../store/useAuthStore';
import { useShallow } from 'zustand/react/shallow';

export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasHydrated, checkSession } = useAuthStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      hasHydrated: state.hasHydrated,
      checkSession: state.checkSession,
    })),
  );

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (hasHydrated && !isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, isLoading, router]);

  return {
    isAuthorized: isAuthenticated,
    isResolved: hasHydrated && !isLoading,
  };
}
