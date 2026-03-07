'use client';

import { create } from 'zustand';

import type { ListingSearchItem } from '../services/api';

export type SearchFiltersState = {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  priceMin: string;
  priceMax: string;
  rooms: string;
  amenities: string;
  rating: string;
};

type AppStore = {
  user: {
    id: string | null;
    name: string;
    role: 'USER' | 'HOST' | 'ADMIN';
    avatar: string | null;
  };
  searchFilters: SearchFiltersState;
  searchResults: ListingSearchItem[];
  setUser: (user: AppStore['user']) => void;
  setSearchFilters: (filters: Partial<SearchFiltersState>) => void;
  setSearchResults: (results: ListingSearchItem[]) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  user: {
    id: null,
    name: 'Guest',
    role: 'USER',
    avatar: null,
  },
  searchFilters: {
    city: '',
    checkIn: '',
    checkOut: '',
    guests: '',
    priceMin: '',
    priceMax: '',
    rooms: '',
    amenities: '',
    rating: '',
  },
  searchResults: [],
  setUser: (user) => set({ user }),
  setSearchFilters: (filters) =>
    set((state) => ({
      searchFilters: {
        ...state.searchFilters,
        ...filters,
      },
    })),
  setSearchResults: (results) => set({ searchResults: results }),
}));
