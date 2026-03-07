import type { PrismaClient } from '@prisma/client';

import type { SearchListingDocument, SearchResultItem } from './search.types.js';

export class SearchRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getListingForIndex(listingId: string) {
    return this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        amenities: {
          include: {
            amenity: {
              select: { name: true },
            },
          },
        },
      },
    });
  }

  public toSearchDocument(listing: {
    id: string;
    title: string;
    description: string;
    city: string;
    country: string;
    pricePerNight: unknown;
    rooms: number | null;
    maxGuests: number | null;
    latitude: unknown;
    longitude: unknown;
    rating: number;
    status: string;
    createdAt: Date;
    amenities: Array<{ amenity: { name: string } }>;
  }): SearchListingDocument {
    const price = toNumberOrNull(listing.pricePerNight);
    const latitude = toNumberOrNull(listing.latitude);
    const longitude = toNumberOrNull(listing.longitude);

    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      city: listing.city,
      country: listing.country,
      price,
      rooms: listing.rooms,
      guests: listing.maxGuests,
      latitude,
      longitude,
      rating: listing.rating,
      amenities: listing.amenities.map((item) => item.amenity.name),
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
      _geo: latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : undefined,
    };
  }

  public async getSearchResultsByIds(ids: string[]): Promise<SearchResultItem[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.prisma.listing.findMany({
      where: { id: { in: ids } },
      include: {
        amenities: {
          include: {
            amenity: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
          take: 5,
        },
      },
    });

    const items: SearchResultItem[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      city: row.city,
      country: row.country,
      price: toNumberOrNull(row.pricePerNight),
      rooms: row.rooms,
      guests: row.maxGuests,
      latitude: toNumberOrNull(row.latitude),
      longitude: toNumberOrNull(row.longitude),
      rating: row.rating,
      trustScore: row.trustScore ?? 0,
      amenities: row.amenities.map((item) => item.amenity.name),
      images: row.images.map((image) => ({
        id: image.id,
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
      })),
    }));

    const byId = new Map(items.map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter((item): item is SearchResultItem => item != null);
  }
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const toNumber = (value as { toNumber: () => number }).toNumber;
    return typeof toNumber === 'function' ? toNumber.call(value) : null;
  }
  return null;
}
