import { ListingStatus, type ListingType, type PrismaClient } from '@prisma/client';

export type CreateListingForImportDto = {
  ownerId: string;
  title: string;
  description: string;
  type: ListingType;
  pricePerNight: number;
  currency: string;
  city: string;
  country: string;
  address: string;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rooms?: number | null;
  maxGuests?: number | null;
};

export class ImportRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findSimilarListings(params: {
    city: string;
    title: string;
    priceMin: number;
    priceMax: number;
  }) {
    return this.prisma.listing.findMany({
      where: {
        status: { in: [ListingStatus.PUBLISHED, ListingStatus.DRAFT] },
        city: params.city,
        pricePerNight: {
          gte: params.priceMin * 0.7,
          lte: params.priceMax * 1.3,
        },
      },
      take: 5,
      select: { id: true, title: true, city: true },
    });
  }

  public async createListing(data: CreateListingForImportDto) {
    return this.prisma.listing.create({
      data: {
        ownerId: data.ownerId,
        title: data.title,
        description: data.description,
        type: data.type,
        pricePerNight: data.pricePerNight,
        currency: data.currency,
        city: data.city,
        country: data.country,
        address: data.address,
        district: data.district ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        rooms: data.rooms ?? null,
        maxGuests: data.maxGuests ?? null,
        status: ListingStatus.DRAFT,
      },
    });
  }

  public async findAmenityByName(name: string) {
    return this.prisma.amenity.findUnique({
      where: { name: name.trim() },
      select: { id: true },
    });
  }

  public async assignAmenities(listingId: string, amenityIds: string[]) {
    if (amenityIds.length === 0) return;
    await this.prisma.listingAmenity.createMany({
      data: amenityIds.map((amenityId) => ({ listingId, amenityId })),
      skipDuplicates: true,
    });
  }

  public async createListingImage(data: { listingId: string; url: string; order: number }) {
    return this.prisma.listingImage.create({
      data: {
        listingId: data.listingId,
        url: data.url,
        order: data.order,
      },
    });
  }
}
