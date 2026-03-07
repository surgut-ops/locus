import { ListingStatus, UserActivityAction, type Prisma, type PrismaClient } from '@prisma/client';

import type {
  RecommendationListing,
  RecommendationUserPreferences,
  TrackUserActivityInput,
} from './recommendations.types.js';

type ActivityWithListing = Prisma.UserActivityGetPayload<{
  include: {
    listing: {
      select: {
        id: true;
        city: true;
        pricePerNight: true;
        amenities: {
          include: {
            amenity: {
              select: {
                name: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export class RecommendationsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createUserActivity(input: TrackUserActivityInput): Promise<void> {
    await this.prisma.userActivity.create({
      data: {
        userId: input.userId,
        listingId: input.listingId ?? null,
        action: input.action,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  public async getUserActivities(userId: string, limit: number): Promise<ActivityWithListing[]> {
    return this.prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        listing: {
          select: {
            id: true,
            city: true,
            pricePerNight: true,
            amenities: {
              include: {
                amenity: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  public async findPersonalizedListings(
    preferences: RecommendationUserPreferences,
    excludeListingIds: string[],
    limit: number,
  ): Promise<RecommendationListing[]> {
    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        id: excludeListingIds.length > 0 ? { notIn: excludeListingIds } : undefined,
        city: preferences.preferredCities.length > 0 ? { in: preferences.preferredCities } : undefined,
        pricePerNight:
          preferences.minPrice !== undefined || preferences.maxPrice !== undefined
            ? {
                gte: preferences.minPrice,
                lte: preferences.maxPrice,
              }
            : undefined,
        amenities:
          preferences.preferredAmenities.length > 0
            ? {
                some: {
                  amenity: {
                    name: {
                      in: preferences.preferredAmenities,
                    },
                  },
                },
              }
            : undefined,
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        images: {
          orderBy: { order: 'asc' },
          take: 5,
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
    });

    return listings.map((listing) => this.toRecommendationListing(listing));
  }

  public async getTrendingListings(limit: number): Promise<RecommendationListing[]> {
    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
      },
      orderBy: [{ reviewCount: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        images: {
          orderBy: { order: 'asc' },
          take: 5,
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
    });

    return listings.map((listing) => this.toRecommendationListing(listing));
  }

  public async getTopRatedListings(limit: number): Promise<RecommendationListing[]> {
    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        images: {
          orderBy: { order: 'asc' },
          take: 5,
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
    });

    return listings.map((listing) => this.toRecommendationListing(listing));
  }

  public countActionsByType(activities: ActivityWithListing[], action: UserActivityAction): number {
    return activities.filter((activity) => activity.action === action).length;
  }

  public buildPreferencesFromActivities(activities: ActivityWithListing[]): RecommendationUserPreferences {
    const listingActivities = activities.filter((activity) => activity.listing !== null);
    const cityCount = new Map<string, number>();
    const amenityCount = new Map<string, number>();
    const prices: number[] = [];

    for (const activity of listingActivities) {
      if (!activity.listing) {
        continue;
      }
      cityCount.set(activity.listing.city, (cityCount.get(activity.listing.city) ?? 0) + 1);

      for (const amenity of activity.listing.amenities) {
        amenityCount.set(amenity.amenity.name, (amenityCount.get(amenity.amenity.name) ?? 0) + 1);
      }

      const price = toNumber(activity.listing.pricePerNight);
      if (price !== null) {
        prices.push(price);
      }
    }

    const [minPrice, maxPrice] = priceRange(prices);

    return {
      preferredCities: sortByCountDesc(cityCount).slice(0, 3),
      preferredAmenities: sortByCountDesc(amenityCount).slice(0, 6),
      minPrice,
      maxPrice,
    };
  }

  private toRecommendationListing(
    listing: Prisma.ListingGetPayload<{
      include: {
        images: true;
        amenities: {
          include: {
            amenity: true;
          };
        };
      };
    }>,
  ): RecommendationListing {
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
      images: listing.images.map((image) => ({
        id: image.id,
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
      })),
      amenities: listing.amenities.map((item) => ({
        id: item.amenity.id,
        name: item.amenity.name,
        icon: item.amenity.icon,
        category: item.amenity.category,
      })),
    };
  }
}

function sortByCountDesc(counter: Map<string, number>): string[] {
  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1])
    .map((item) => item[0]);
}

function priceRange(prices: number[]): [number | undefined, number | undefined] {
  if (prices.length === 0) {
    return [undefined, undefined];
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return [Math.max(0, min * 0.9), max * 1.1];
}

function toNumber(value: { toNumber: () => number } | null): number | null {
  if (!value) {
    return null;
  }
  return value.toNumber();
}
