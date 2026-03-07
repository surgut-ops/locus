import { createHash } from 'node:crypto';

import { CACHE_TTL, CacheService } from '../infrastructure/cache/cache.service.js';
import type { RecommendationsService } from '../recommendations/recommendations.service.js';
import { SearchClient } from './search.client.js';
import { SearchRepository } from './search.repository.js';
import { type SearchQueryDto, type SearchResponse, SearchError } from './search.types.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export class SearchService {
  public constructor(
    private readonly repository: SearchRepository,
    private readonly client: SearchClient,
    private readonly cache: CacheService,
    private readonly recommendationsService?: RecommendationsService,
  ) {}

  public async searchListings(query: unknown, userId?: string): Promise<SearchResponse> {
    const dto = parseSearchQuery(query);
    if (userId && this.recommendationsService) {
      await this.recommendationsService.trackSearch(userId, {
        city: dto.city,
        priceMin: dto.priceMin,
        priceMax: dto.priceMax,
        rooms: dto.rooms,
        guests: dto.guests,
        amenities: dto.amenities,
      });
    }
    const cacheKey = this.cache.keys.searchResults(hashSearchQuery(dto));
    const cached = await this.cache.get<SearchResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const offset = (dto.page - 1) * dto.limit;
    const filter = buildFilters(dto);
    const sort = buildSort(dto);

    const meiliResult = await this.client.searchListings({
      filter,
      sort,
      offset,
      limit: dto.limit,
    });

    const listings = await this.repository.getSearchResultsByIds(meiliResult.ids);
    const response: SearchResponse = {
      listings,
      total: meiliResult.total,
      page: dto.page,
      limit: dto.limit,
    };

    await this.cache.set(cacheKey, response, CACHE_TTL.SEARCH_RESULTS);
    return response;
  }
}

export function parseSearchQuery(query: unknown): SearchQueryDto {
  if (!isObject(query)) {
    return { page: 1, limit: DEFAULT_LIMIT };
  }

  return {
    city: optionalString(query.city),
    priceMin: optionalNumber(query.priceMin, 'priceMin'),
    priceMax: optionalNumber(query.priceMax, 'priceMax'),
    rooms: optionalInt(query.rooms, 'rooms'),
    guests: optionalInt(query.guests, 'guests'),
    amenities: parseAmenities(query.amenities),
    latitude: optionalNumber(query.latitude, 'latitude'),
    longitude: optionalNumber(query.longitude, 'longitude'),
    radius: optionalPositiveInt(query.radius, 'radius'),
    page: clampPage(optionalPositiveInt(query.page, 'page') ?? 1),
    limit: clampLimit(optionalPositiveInt(query.limit, 'limit') ?? DEFAULT_LIMIT),
    sortBy: parseSortBy(query.sortBy),
    sortOrder: parseSortOrder(query.sortOrder),
  };
}

function buildFilters(dto: SearchQueryDto): string[] {
  const filters: string[] = ['status = "PUBLISHED"'];

  if (dto.city) {
    filters.push(`city = "${escapeFilterValue(dto.city)}"`);
  }
  if (dto.priceMin !== undefined) {
    filters.push(`price >= ${dto.priceMin}`);
  }
  if (dto.priceMax !== undefined) {
    filters.push(`price <= ${dto.priceMax}`);
  }
  if (dto.rooms !== undefined) {
    filters.push(`rooms >= ${dto.rooms}`);
  }
  if (dto.guests !== undefined) {
    filters.push(`guests >= ${dto.guests}`);
  }
  if (dto.amenities && dto.amenities.length > 0) {
    const amenitiesFilter = dto.amenities
      .map((item) => `amenities = "${escapeFilterValue(item)}"`)
      .join(' AND ');
    filters.push(`(${amenitiesFilter})`);
  }
  if (
    dto.latitude !== undefined &&
    dto.longitude !== undefined &&
    dto.radius !== undefined
  ) {
    filters.push(`_geoRadius(${dto.latitude}, ${dto.longitude}, ${dto.radius})`);
  }

  return filters;
}

function buildSort(dto: SearchQueryDto): string[] {
  if (!dto.sortBy) {
    return ['createdAt:desc'];
  }
  const order =
    dto.sortOrder ??
    (dto.sortBy === 'price' ? 'asc' : 'desc');

  if (dto.sortBy === 'newest') {
    return [`createdAt:${order}`];
  }

  return [`${dto.sortBy}:${order}`];
}

function hashSearchQuery(dto: SearchQueryDto): string {
  const raw = JSON.stringify(dto);
  return createHash('sha256').update(raw).digest('hex');
}

function parseAmenities(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parts = typeof value === 'string' ? value.split(',') : [];
  const normalized = parts.map((part) => part.trim()).filter(Boolean);
  return normalized.length > 0 ? [...new Set(normalized)] : undefined;
}

function parseSortBy(value: unknown): SearchQueryDto['sortBy'] {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === 'price' || value === 'rating' || value === 'newest') {
    return value;
  }
  throw new SearchError('sortBy must be one of: price, rating, newest', 400);
}

function parseSortOrder(value: unknown): SearchQueryDto['sortOrder'] {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === 'asc' || value === 'desc') {
    return value;
  }
  throw new SearchError('sortOrder must be one of: asc, desc', 400);
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new SearchError('Expected string query value', 400);
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed =
    typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : Number.NaN;
  if (Number.isNaN(parsed)) {
    throw new SearchError(`Query "${field}" must be a number`, 400);
  }
  return parsed;
}

function optionalInt(value: unknown, field: string): number | undefined {
  const parsed = optionalNumber(value, field);
  if (parsed === undefined) {
    return undefined;
  }
  if (!Number.isInteger(parsed)) {
    throw new SearchError(`Query "${field}" must be an integer`, 400);
  }
  return parsed;
}

function optionalPositiveInt(value: unknown, field: string): number | undefined {
  const parsed = optionalInt(value, field);
  if (parsed === undefined) {
    return undefined;
  }
  if (parsed <= 0) {
    throw new SearchError(`Query "${field}" must be greater than 0`, 400);
  }
  return parsed;
}

function clampLimit(value: number): number {
  return Math.min(Math.max(value, 1), MAX_LIMIT);
}

function clampPage(value: number): number {
  return Math.max(value, 1);
}

function escapeFilterValue(value: string): string {
  return value.replace(/"/g, '\\"');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
