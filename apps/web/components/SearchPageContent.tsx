'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  aiSearch,
  searchListings,
  travelSearch,
  type ListingSearchItem,
  type TravelSearchResponse,
} from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { ListingsGrid } from './ListingsGrid';
import { TravelMap } from './TravelMap';
import { SearchFilters } from './SearchFilters';
import { Button, Modal } from './ui';

const DynamicMapSearch = dynamic(() => import('./MapSearch').then((m) => m.MapSearch), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
});

const DynamicTravelMap = dynamic(() => import('./TravelMap').then((m) => m.TravelMap), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
});

export function SearchPageContent() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [results, setResults] = useState<ListingSearchItem[]>([]);
  const [travelData, setTravelData] = useState<TravelSearchResponse | null>(null);
  const filters = useAppStore((state) => state.searchFilters);
  const setSearchFilters = useAppStore((state) => state.setSearchFilters);
  const setSearchResults = useAppStore((state) => state.setSearchResults);

  const aiQuery = params.get('q') ?? params.get('aiQuery') ?? '';
  const travelMode = params.get('mode') === 'travel';
  const placeQuery = params.get('place') ?? '';

  useEffect(() => {
    if (!aiQuery) {
      setSearchFilters({
        city: params.get('city') ?? '',
        priceMin: params.get('priceMin') ?? '',
        priceMax: params.get('priceMax') ?? '',
        rooms: params.get('rooms') ?? '',
        guests: params.get('guests') ?? '',
      });
    }
  }, [params, setSearchFilters, aiQuery]);

  const uiValues = useMemo(
    () => ({
      city: filters.city,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      rooms: filters.rooms,
      guests: filters.guests,
      amenities: filters.amenities,
      rating: filters.rating,
    }),
    [filters],
  );

  const runSearch = async () => {
    setLoading(true);
    try {
      if (aiQuery) {
        const response = await aiSearch(aiQuery);
        setResults(response.listings);
        setSearchResults(response.listings);
      } else {
        const response = await searchListings({
          city: filters.city,
          priceMin: filters.priceMin,
          priceMax: filters.priceMax,
          rooms: filters.rooms,
          guests: filters.guests,
          page: 1,
          limit: 24,
        });

        const minRating = filters.rating ? Number(filters.rating) : undefined;
        const amenitiesFilter = filters.amenities
          .split(',')
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean);

        let nextResults = response.listings;
        if (Number.isFinite(minRating)) {
          nextResults = nextResults.filter((item) => item.rating >= Number(minRating));
        }
        if (amenitiesFilter.length > 0) {
          nextResults = nextResults.filter((item) =>
            amenitiesFilter.every((amenity) =>
              item.amenities.map((value) => value.toLowerCase()).includes(amenity),
            ),
          );
        }

        setResults(nextResults);
        setSearchResults(nextResults);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiQuery, travelMode, placeQuery, params.get('radiusKm'), filters.city, filters.priceMin, filters.priceMax, filters.rooms, filters.guests]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Search listings</h1>
        <div className="flex items-center gap-2 md:hidden">
          <Button variant="secondary" onClick={() => setMobileFiltersOpen(true)}>
            Filters
          </Button>
          <Button variant="secondary" onClick={() => setMobileMapOpen(true)}>
            Map
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <SearchFilters
            values={uiValues}
            onChange={(next) => setSearchFilters(next)}
            onSubmit={() => void runSearch()}
            onReset={() =>
              setSearchFilters({
                city: '',
                priceMin: '',
                priceMax: '',
                rooms: '',
                guests: '',
                amenities: '',
                rating: '',
              })
            }
          />
        </aside>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_460px]">
            <ListingsGrid listings={results} loading={loading} />
            <div className="hidden xl:block">
              <DynamicMapSearch className="h-[680px]" />
            </div>
          </div>
        </div>
      </div>

      <Modal open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} title="Search filters">
        <SearchFilters
          values={uiValues}
          onChange={(next) => setSearchFilters(next)}
          onSubmit={() => {
            void runSearch();
            setMobileFiltersOpen(false);
          }}
          onReset={() =>
            setSearchFilters({
              city: '',
              priceMin: '',
              priceMax: '',
              rooms: '',
              guests: '',
              amenities: '',
              rating: '',
            })
          }
        />
      </Modal>

      {mobileMapOpen ? (
        <div className="fixed inset-0 z-50 bg-white xl:hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-base font-semibold text-slate-900">Map</h3>
            <Button variant="ghost" onClick={() => setMobileMapOpen(false)}>
              Close
            </Button>
          </div>
          <div className="h-[calc(100vh-56px)]">
            {travelData ? (
              <DynamicTravelMap data={travelData} className="h-full rounded-none border-0" />
            ) : (
              <DynamicMapSearch className="h-full rounded-none border-0" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
