import {
  ListingStatus,
  type ListingType,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';

import type {
  MatchListingItem,
  MatchRecommendationItem,
  MatchUserPreferences,
} from './match.types.js';

type ActivityWithListingAndMeta = Prisma.UserActivityGetPayload<{
  include: {
    listing: {
      select: {
        id: true;
        city: true;
        country: true;
        type: true;
        pricePerNight: true;
        amenities: {
          include: {
            amenity: { select: { name: true } };
          };
        };
      };
    };
  };
}>;

const LISTING_TYPES: ListingType[] = [
  'APARTMENT',
  'HOUSE',
  'STUDIO',
  'ROOM',
  'VILLA',
  'HOTEL',
];

function toNumber(value: { toNumber: () => number } | null): number | null {
  if (!value) return null;
  return value.toNumber();
}

export class MatchRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getActivitiesWithMetadata(
    userId: string,
    limit: number,
  ): Promise<ActivityWithListingAndMeta[]> {
    return this.prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        listing: {
          select: {
            id: true,
            city: true,
            country: true,
            type: true,
            pricePerNight: true,
            amenities: {
              include: {
                amenity: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  public buildPreferencesFromActivities(
    activities: ActivityWithListingAndMeta[],
  ): MatchUserPreferences {
    const cityCount = new Map<string, number>();
    const amenityCount = new Map<string, number>();
    const typeCount = new Map<string, number>();
    const prices: number[] = [];

    for (const activity of activities) {
      const meta = activity.metadata as { query?: Record<string, unknown> } | null;
      if (meta?.query) {
        const q = meta.query;
        if (typeof q.city === 'string' && q.city.trim()) {
          cityCount.set(q.city.trim(), (cityCount.get(q.city.trim()) ?? 0) + 2);
        }
        if (typeof q.priceMin === 'number' && q.priceMin > 0) {
          prices.push(q.priceMin);
        }
        if (typeof q.priceMax === 'number' && q.priceMax > 0) {
          prices.push(q.priceMax);
        }
        if (Array.isArray(q.amenities)) {
          for (const a of q.amenities) {
            if (typeof a === 'string') {
              amenityCount.set(a, (amenityCount.get(a) ?? 0) + 2);
            }
          }
        }
      }

      if (activity.listing) {
        cityCount.set(activity.listing.city, (cityCount.get(activity.listing.city) ?? 0) + 1);
        typeCount.set(activity.listing.type, (typeCount.get(activity.listing.type) ?? 0) + 1);
        for (const item of activity.listing.amenities) {
          amenityCount.set(
            item.amenity.name,
            (amenityCount.get(item.amenity.name) ?? 0) + 1,
          );
        }
        const p = toNumber(activity.listing.pricePerNight);
        if (p !== null) prices.push(p);
      }
    }

    const [minPrice, maxPrice] = priceRange(prices);
    return {
      favoriteCities: sortByCountDesc(cityCount).slice(0, 5),
      priceMin: minPrice,
      priceMax: maxPrice,
      propertyTypes: sortByCountDesc(typeCount)
        .filter((t): t is ListingType => LISTING_TYPES.includes(t as ListingType))
        .slice(0, 4),
      amenities: sortByCountDesc(amenityCount).slice(0, 8),
    };
  }

  public async upsertUserPreference(
    userId: string,
    prefs: MatchUserPreferences,
  ): Promise<void> {
    await this.prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        favoriteCities: prefs.favoriteCities as unknown as Prisma.JsonArray,
        priceMin: prefs.priceMin,
        priceMax: prefs.priceMax,
        propertyTypes: prefs.propertyTypes as unknown as Prisma.JsonArray,
        amenities: prefs.amenities as unknown as Prisma.JsonArray,
      },
      update: {
        favoriteCities: prefs.favoriteCities as unknown as Prisma.JsonArray,
        priceMin: prefs.priceMin,
        priceMax: prefs.priceMax,
        propertyTypes: prefs.propertyTypes as unknown as Prisma.JsonArray,
        amenities: prefs.amenities as unknown as Prisma.JsonArray,
      },
    });
  }

  public async findMatchCandidates(
    preferences: MatchUserPreferences,
    excludeListingIds: string[],
    limit: number,
  ): Promise<MatchListingItem[]> {
    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        id: excludeListingIds.length > 0 ? { notIn: excludeListingIds } : undefined,
        city:
          preferences.favoriteCities.length > 0
            ? { in: preferences.favoriteCities }
            : undefined,
        type:
          preferences.propertyTypes.length > 0
            ? { in: preferences.propertyTypes }
            : undefined,
        pricePerNight:
          preferences.priceMin !== undefined || preferences.priceMax !== undefined
            ? {
                gte: preferences.priceMin,
                lte: preferences.priceMax,
              }
            : undefined,
        amenities:
          preferences.amenities.length > 0
            ? {
                some: {
                  amenity: {
                    name: { in: preferences.amenities },
                  },
                },
              }
            : undefined,
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        images: { orderBy: { order: 'asc' }, take: 5 },
        amenities: { include: { amenity: true } },
      },
    });

    return listings.map((l) => toMatchListingItem(l));
  }

  public async getFallbackListings(
    limit: number,
    excludeIds: string[] = [],
  ): Promise<MatchListingItem[]> {
    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: limit,
      include: {
        images: { orderBy: { order: 'asc' }, take: 5 },
        amenities: { include: { amenity: true } },
      },
    });
    return listings.map((l) => toMatchListingItem(l));
  }
}

function sortByCountDesc(counter: Map<string, number>): string[] {
  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

function priceRange(
  prices: number[],
): [number | undefined, number | undefined] {
  if (prices.length === 0) return [undefined, undefined];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return [Math.max(0, Math.floor(min * 0.9)), Math.ceil(max * 1.1)];
}

function toMatchListingItem(
  listing: Prisma.ListingGetPayload<{
    include: {
      images: true;
      amenities: { include: { amenity: true } };
    };
  }>,
): MatchListingItem {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    city: listing.city,
    district: listing.district,
    country: listing.country,
    address: listing.address,
    type: listing.type,
    rating: listing.rating,
    reviewCount: listing.reviewCount,
    pricePerNight: toNumber(listing.pricePerNight),
    pricePerMonth: toNumber(listing.pricePerMonth),
    currency: listing.currency,
    maxGuests: listing.maxGuests,
    images: listing.images.map((img) => ({
      id: img.id,
      url: img.url,
      thumbnailUrl: img.thumbnailUrl,
    })),
    amenities: listing.amenities.map((a) => ({
      id: a.amenity.id,
      name: a.amenity.name,
      icon: a.amenity.icon,
      category: a.amenity.category,
    })),
  };
}
