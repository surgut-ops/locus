import { haversineKm, TravelRepository } from './travel.repository.js';
import type {
  TravelSearchPayload,
  TravelSearchResponse,
  TravelSearchResultItem,
} from './travel.types.js';
import { TravelError } from './travel.types.js';

const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 50;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const AVG_SPEED_KMH = 30;
const SCORE_MAX = 100;

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export class TravelService {
  public constructor(private readonly repository: TravelRepository) {}

  public async search(payload: TravelSearchPayload): Promise<TravelSearchResponse> {
    const place = payload.place?.trim();
    if (!place) {
      throw new TravelError('Place is required', 400);
    }

    const coords = await this.resolvePlace(place);
    if (!coords) {
      throw new TravelError(`Place not found: ${place}`, 404);
    }

    const radiusKm = Math.min(
      MAX_RADIUS_KM,
      Math.max(1, payload.radiusKm ?? DEFAULT_RADIUS_KM),
    );
    const limit = Math.min(MAX_LIMIT, Math.max(1, payload.limit ?? DEFAULT_LIMIT));

    const bounds = this.getBounds(coords.lat, coords.lng, radiusKm);
    const candidates = await this.repository.findListingsInBounds(
      bounds.north,
      bounds.south,
      bounds.east,
      bounds.west,
    );

    const withDistance: Array<{ id: string; distance: number }> = [];
    for (const c of candidates) {
      const d = haversineKm(coords.lat, coords.lng, c.latitude, c.longitude);
      if (d <= radiusKm) {
        withDistance.push({ id: c.id, distance: d });
      }
    }

    withDistance.sort((a, b) => a.distance - b.distance);
    const top = withDistance.slice(0, limit);
    const ids = top.map((t) => t.id);
    const listings = await this.repository.getListingsByIds(ids);
    const byId = new Map(listings.map((l) => [l.id, l]));

    const results: TravelSearchResultItem[] = top
      .map(({ id, distance }) => {
        const listing = byId.get(id);
        if (!listing) return null;
        const distanceScore = this.calculateDistanceScore(distance, radiusKm);
        const travelTime = Math.round((distance / AVG_SPEED_KMH) * 60);
        return {
          listing,
          distance: Math.round(distance * 100) / 100,
          distanceScore,
          travelTime,
        };
      })
      .filter((r): r is TravelSearchResultItem => r != null);

    return {
      place: coords.displayName ?? place,
      latitude: coords.lat,
      longitude: coords.lng,
      radiusKm,
      results,
    };
  }

  private async resolvePlace(
    query: string,
  ): Promise<{ lat: number; lng: number; displayName?: string } | null> {
    try {
      const url = new URL(NOMINATIM_URL);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'LOCUS-Travel/1.0',
        },
      });

      if (!response.ok) return null;

      const data = (await response.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
      }>;

      const first = data[0];
      if (!first?.lat || !first?.lon) return null;

      const lat = parseFloat(first.lat);
      const lng = parseFloat(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        lat,
        lng,
        displayName: first.display_name,
      };
    } catch {
      return null;
    }
  }

  private getBounds(
    lat: number,
    lng: number,
    radiusKm: number,
  ): { north: number; south: number; east: number; west: number } {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    return {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lng + lngDelta,
      west: lng - lngDelta,
    };
  }

  private calculateDistanceScore(distanceKm: number, maxRadiusKm: number): number {
    if (distanceKm <= 0) return SCORE_MAX;
    const ratio = distanceKm / maxRadiusKm;
    return Math.round(Math.max(0, SCORE_MAX - ratio * 80));
  }
}
