'use client';

import { create } from 'zustand';

import {
  getCurrentUser,
  getStoredToken,
  getStoredUser,
  logout as logoutSession,
  type AuthResponse,
  type AuthUser,
} from '../services/auth';

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  setSession: (session: AuthResponse) => void;
  checkSession: () => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  hasHydrated: false,
  setSession: (session) =>
    set({
      user: session.user,
      token: session.token,
      isAuthenticated: true,
      isLoading: false,
      hasHydrated: true,
    }),
  checkSession: async () => {
    const state = get();
    if (state.isLoading || state.hasHydrated) {
      return;
    }

    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (!storedToken) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        hasHydrated: true,
      });
      return;
    }

    set({
      token: storedToken,
      user: storedUser,
      isAuthenticated: false,
      isLoading: true,
      hasHydrated: false,
    });

    try {
      const user = await getCurrentUser();
      set({
        user,
        token: storedToken,
        isAuthenticated: true,
        isLoading: false,
        hasHydrated: true,
      });
    } catch {
      logoutSession();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        hasHydrated: true,
      });
    }
  },
  logout: () => {
    logoutSession();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: true,
    });
  },
}));
