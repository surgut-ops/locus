import { createHash } from 'node:crypto';

import { CacheService } from '../infrastructure/cache/cache.service.js';
import type { SearchResponse } from '../search/search.types.js';
import { SearchService } from '../search/search.service.js';
import type { AiSearchParsedFilters, AiSearchResponse } from './ai-search.types.js';

const AI_SEARCH_CACHE_TTL_SECONDS = 120;

const AMENITY_HINTS = [
  'WiFi',
  'Parking',
  'Air conditioning',
  'Kitchen',
  'Pool',
  'TV',
  'Washing machine',
  'Balcony',
  'Heating',
];

export class AiSearchService {
  public constructor(
    private readonly searchService: SearchService,
    private readonly cache: CacheService,
  ) {}

  public async search(query: string): Promise<AiSearchResponse> {
    const trimmed = query?.trim();
    if (!trimmed) {
      return this.emptyResponse();
    }

    const cacheKey = this.cache.keys.aiSearchResults(this.hashQuery(trimmed));
    const cached = await this.cache.get<AiSearchResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    let filters: AiSearchParsedFilters;
    try {
      filters = await this.parseQueryWithAI(trimmed);
    } catch {
      filters = {};
    }

    const searchQuery = {
      city: filters.city,
      priceMax: filters.priceMax,
      rooms: filters.rooms,
      guests: filters.guests,
      amenities: filters.amenities?.join(','),
      page: 1,
      limit: 24,
    };

    const result = await this.searchService.searchListings(searchQuery);
    const response = this.toAiSearchResponse(result, filters);
    await this.cache.set(cacheKey, response, AI_SEARCH_CACHE_TTL_SECONDS);
    return response;
  }

  private async parseQueryWithAI(query: string): Promise<AiSearchParsedFilters> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {};
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Extract real-estate search filters from the user's natural language query.
Return a JSON object with optional keys: city, priceMax, rooms, guests, amenities.
- city: string, e.g. "Moscow", "Dubai"
- priceMax: number, max price per night in USD (e.g. "до 100$" -> 100)
- rooms: number, minimum rooms
- guests: number, minimum guests
- amenities: array of strings. Use exact names from this list: ${AMENITY_HINTS.join(', ')}.
  Map common words: "парковка"->"Parking", "wifi"->"WiFi", "бассейн"->"Pool", "кондиционер"->"Air conditioning", "кухня"->"Kitchen", "телевизор"->"TV", "стиральная машина"->"Washing machine", "балкон"->"Balcony", "отопление"->"Heating".
Return only valid JSON, no extra text.`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('AI parse failed');
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return {};
    }

    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return {
        city: typeof parsed.city === 'string' ? parsed.city.trim() : undefined,
        priceMax: typeof parsed.priceMax === 'number' ? parsed.priceMax : undefined,
        rooms: typeof parsed.rooms === 'number' ? parsed.rooms : undefined,
        guests: typeof parsed.guests === 'number' ? parsed.guests : undefined,
        amenities: Array.isArray(parsed.amenities)
          ? parsed.amenities.filter((a): a is string => typeof a === 'string').map((a) => a.trim())
          : undefined,
      };
    } catch {
      return {};
    }
  }

  private toAiSearchResponse(
    result: SearchResponse,
    filtersUsed: AiSearchParsedFilters,
  ): AiSearchResponse {
    return {
      listings: result.listings,
      total: result.total,
      page: result.page,
      limit: result.limit,
      filtersUsed,
    };
  }

  private emptyResponse(): AiSearchResponse {
    return {
      listings: [],
      total: 0,
      page: 1,
      limit: 24,
      filtersUsed: {},
    };
  }

  private hashQuery(query: string): string {
    return createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
  }
}
