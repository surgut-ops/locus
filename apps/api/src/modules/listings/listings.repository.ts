import { ListingStatus, type PrismaClient } from '@prisma/client';

import type {
  CreateListingDto,
  ListingsMapBoundsDto,
  ListingsMapItem,
  UpdateListingDto,
} from './listings.types.js';

export class ListingsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createListing(ownerId: string, dto: CreateListingDto) {
    return this.prisma.listing.create({
      data: {
        ownerId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        pricePerNight: dto.price,
        pricePerMonth: null,
        currency: dto.currency,
        city: dto.city,
        country: dto.country,
        address: `${dto.city}, ${dto.country}`,
        latitude: dto.latitude,
        longitude: dto.longitude,
        rooms: dto.rooms,
        maxGuests: dto.guests,
        status: ListingStatus.DRAFT,
      },
    });
  }

  public async getListingDetailsById(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            rating: true,
            reviewCount: true,
            isVerified: true,
            trustScore: true,
            reputationScore: true,
            emailVerified: true,
            phoneVerified: true,
            identityVerified: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                rating: true,
                reviewCount: true,
                isVerified: true,
                trustScore: true,
                emailVerified: true,
                phoneVerified: true,
                identityVerified: true,
              },
            },
          },
        },
      },
    });
  }

  public async updateListingById(id: string, dto: UpdateListingDto) {
    const data: Record<string, unknown> = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.pricePerNight = dto.price;
    if (dto.rooms !== undefined) data.rooms = dto.rooms;
    if (dto.guests !== undefined) data.maxGuests = dto.guests;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.coordinates !== undefined) {
      data.latitude = dto.coordinates.latitude;
      data.longitude = dto.coordinates.longitude;
    }

    return this.prisma.listing.update({
      where: { id },
      data,
    });
  }

  public async archiveListingById(id: string) {
    return this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.ARCHIVED },
    });
  }

  public async getListingOwnerId(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    return listing?.ownerId ?? null;
  }

  public async getMyListings(userId: string, limit = 50, offset = 0) {
    return this.prisma.listing.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
      include: {
        images: {
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
    });
  }

  public async getHostListingsByUserId(userId: string, limit = 50, offset = 0) {
    return this.getMyListings(userId, limit, offset);
  }

  public async getListingsForMap(bounds: ListingsMapBoundsDto): Promise<ListingsMapItem[]> {
    const rows = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        latitude: {
          not: null,
          gte: bounds.south,
          lte: bounds.north,
        },
        longitude: {
          not: null,
          gte: bounds.west,
          lte: bounds.east,
        },
      },
      select: {
        id: true,
        title: true,
        pricePerNight: true,
        latitude: true,
        longitude: true,
        images: {
          orderBy: { order: 'asc' },
          take: 1,
          select: {
            url: true,
            thumbnailUrl: true,
          },
        },
      },
      take: 500,
    });

    const items: ListingsMapItem[] = [];
    for (const row of rows) {
      const latitude = toNumberOrNull(row.latitude);
      const longitude = toNumberOrNull(row.longitude);
      if (latitude === null || longitude === null) {
        continue;
      }

      items.push({
        id: row.id,
        title: row.title,
        price: toNumberOrNull(row.pricePerNight),
        latitude,
        longitude,
        image: row.images[0]?.thumbnailUrl ?? row.images[0]?.url ?? null,
      });
    }

    return items;
  }

  public async getListingForPublishValidation(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      include: {
        images: {
          select: { id: true },
        },
      },
    });
  }

  public async publishListingById(id: string) {
    return this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.PUBLISHED },
    });
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
