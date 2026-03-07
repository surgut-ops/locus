import type { PrismaClient } from '@prisma/client';

import type { CreateAmenityDto } from './amenities.types.js';

export class AmenitiesRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createAmenity(dto: CreateAmenityDto) {
    return this.prisma.amenity.create({
      data: {
        name: dto.name,
        icon: dto.icon,
        category: dto.category,
      },
    });
  }

  public async findAmenityByName(name: string) {
    return this.prisma.amenity.findUnique({
      where: { name },
      select: { id: true },
    });
  }

  public async getAllAmenities() {
    return this.prisma.amenity.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  public async getListingOwnerId(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerId: true },
    });
    return listing?.ownerId ?? null;
  }

  public async findAmenitiesByIds(amenityIds: string[]) {
    return this.prisma.amenity.findMany({
      where: {
        id: { in: amenityIds },
      },
      select: { id: true },
    });
  }

  public async assignAmenitiesToListing(listingId: string, amenityIds: string[]) {
    if (amenityIds.length === 0) {
      return { count: 0 };
    }

    return this.prisma.listingAmenity.createMany({
      data: amenityIds.map((amenityId) => ({
        listingId,
        amenityId,
      })),
      skipDuplicates: true,
    });
  }

  public async removeAmenityFromListing(listingId: string, amenityId: string) {
    return this.prisma.listingAmenity.deleteMany({
      where: { listingId, amenityId },
    });
  }

  public async getListingAmenities(listingId: string) {
    return this.prisma.listingAmenity.findMany({
      where: { listingId },
      include: { amenity: true },
      orderBy: [{ amenity: { category: 'asc' } }, { amenity: { name: 'asc' } }],
    });
  }
}
