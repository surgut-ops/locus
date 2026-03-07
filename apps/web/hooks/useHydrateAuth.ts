'use client';

import { useEffect } from 'react';

import { useAppStore } from '../store/app.store';

export function useHydrateAuth() {
  const hydrate = useAppStore((state) => state.hydrateFromStorage);

  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
