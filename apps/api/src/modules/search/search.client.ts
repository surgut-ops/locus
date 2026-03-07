import type { SearchListingDocument } from './search.types.js';

type MeiliSearchResponse = {
  hits: Array<{ id: string }>;
  estimatedTotalHits?: number;
  totalHits?: number;
};

type SearchRequest = {
  query?: string;
  filter: string[];
  sort: string[];
  offset: number;
  limit: number;
};

export class SearchClient {
  private readonly host: string;
  private readonly index: string;
  private readonly apiKey: string | null;
  private initialized = false;

  public constructor() {
    this.host = (process.env.MEILISEARCH_HOST ?? '').replace(/\/$/, '');
    this.index = process.env.MEILISEARCH_INDEX_LISTINGS ?? 'listings';
    this.apiKey = process.env.MEILISEARCH_KEY ?? null;
  }

  public isEnabled(): boolean {
    return Boolean(this.host);
  }

  public async ensureIndex(): Promise<void> {
    if (!this.isEnabled() || this.initialized) {
      return;
    }

    await this.request(`/indexes/${this.index}`, {
      method: 'POST',
      body: { uid: this.index, primaryKey: 'id' },
      allow404AsSuccess: true,
      allow409AsSuccess: true,
    });

    await this.request(`/indexes/${this.index}/settings/filterable-attributes`, {
      method: 'PUT',
      body: [
        'city',
        'country',
        'price',
        'rooms',
        'guests',
        'amenities',
        'status',
        '_geo',
      ],
    });

    await this.request(`/indexes/${this.index}/settings/sortable-attributes`, {
      method: 'PUT',
      body: ['price', 'rating', 'createdAt'],
    });

    this.initialized = true;
  }

  public async upsertListingDocument(document: SearchListingDocument): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    await this.ensureIndex();
    await this.request(`/indexes/${this.index}/documents`, {
      method: 'POST',
      body: [document],
    });
  }

  public async deleteListingDocument(id: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    await this.ensureIndex();
    await this.request(`/indexes/${this.index}/documents/${id}`, {
      method: 'DELETE',
      allow404AsSuccess: true,
    });
  }

  public async searchListings(input: SearchRequest): Promise<{ ids: string[]; total: number }> {
    if (!this.isEnabled()) {
      return { ids: [], total: 0 };
    }
    await this.ensureIndex();

    const result = await this.request<MeiliSearchResponse>(`/indexes/${this.index}/search`, {
      method: 'POST',
      body: {
        q: input.query ?? '',
        filter: input.filter.length > 0 ? input.filter : undefined,
        sort: input.sort.length > 0 ? input.sort : undefined,
        offset: input.offset,
        limit: input.limit,
      },
    });

    const total = result.estimatedTotalHits ?? result.totalHits ?? result.hits.length;
    return {
      ids: result.hits.map((hit) => hit.id),
      total,
    };
  }

  private async request<T = unknown>(
    path: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      allow404AsSuccess?: boolean;
      allow409AsSuccess?: boolean;
    },
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.host}${path}`, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 404 && options.allow404AsSuccess) {
      return {} as T;
    }
    if (response.status === 409 && options.allow409AsSuccess) {
      return {} as T;
    }
    if (!response.ok) {
      throw new Error(`Meilisearch request failed: ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }
    return (await response.json()) as T;
  }
}
