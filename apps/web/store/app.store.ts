'use client';

import { create } from 'zustand';

type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

type AppState = {
  auth: {
    userId: string | null;
    role: string;
    isAuthenticated: boolean;
  };
  profile: UserProfile | null;
  favorites: string[];
  setAuth: (userId: string, role: string) => void;
  setProfile: (profile: UserProfile | null) => void;
  toggleFavorite: (listingId: string) => void;
  hydrateFromStorage: () => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  auth: {
    userId: null,
    role: 'USER',
    isAuthenticated: false,
  },
  profile: null,
  favorites: [],
  setAuth: (userId, role) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('locus_user_id', userId);
      localStorage.setItem('locus_user_role', role);
    }
    set({
      auth: { userId, role, isAuthenticated: true },
    });
  },
  setProfile: (profile) => set({ profile }),
  toggleFavorite: (listingId) => {
    const favorites = get().favorites;
    const exists = favorites.includes(listingId);
    const updated = exists ? favorites.filter((id) => id !== listingId) : [...favorites, listingId];
    set({ favorites: updated });
  },
  hydrateFromStorage: () => {
    if (typeof window === 'undefined') {
      return;
    }
    const userId = localStorage.getItem('locus_user_id');
    const role = localStorage.getItem('locus_user_role') ?? 'USER';
    if (userId) {
      set({
        auth: {
          userId,
          role,
          isAuthenticated: true,
        },
      });
    }
  },
}));
