import { BookingStatus, ListingStatus, type ListingType, type PrismaClient } from '@prisma/client';

export type SimilarListingRow = {
  id: string;
  pricePerNight: { toNumber(): number } | null;
  rooms: number | null;
  maxGuests: number | null;
  rating: number;
  reviewCount: number;
  amenities: Array<{ amenity: { name: string } }>;
};

export class PricingRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getListingForPricing(listingId: string) {
    return this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        ownerId: true,
        city: true,
        district: true,
        type: true,
        rooms: true,
        maxGuests: true,
        area: true,
        rating: true,
        reviewCount: true,
        pricePerNight: true,
        title: true,
        description: true,
        amenities: {
          include: {
            amenity: { select: { name: true } },
          },
        },
      },
    });
  }

  public async getSimilarListings(params: {
    city: string;
    type: ListingType;
    rooms: number | null;
    maxGuests: number | null;
    excludeId: string;
  }): Promise<SimilarListingRow[]> {
    const roomsFilter =
      params.rooms !== null
        ? {
            OR: [
              { rooms: params.rooms },
              { rooms: params.rooms - 1 },
              { rooms: params.rooms + 1 },
            ],
          }
        : undefined;

    const rows = await this.prisma.listing.findMany({
      where: {
        id: { not: params.excludeId },
        status: ListingStatus.PUBLISHED,
        city: params.city,
        type: params.type,
        pricePerNight: { not: null },
        ...roomsFilter,
      },
      take: 50,
      select: {
        id: true,
        pricePerNight: true,
        rooms: true,
        maxGuests: true,
        rating: true,
        reviewCount: true,
        amenities: {
          include: {
            amenity: { select: { name: true } },
          },
        },
      },
    });

    return rows as SimilarListingRow[];
  }

  public async getListingBookingsCount(listingId: string): Promise<number> {
    return this.prisma.booking.count({
      where: {
        listingId,
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
      },
    });
  }
}
