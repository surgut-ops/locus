import { ListingStatus, type PrismaClient } from '@prisma/client';

import type { TravelListingItem } from './travel.types.js';

const EARTH_RADIUS_KM = 6371;

export class TravelRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findListingsInBounds(
    north: number,
    south: number,
    east: number,
    west: number,
  ): Promise<Array<{ id: string; latitude: number; longitude: number }>> {
    const rows = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        latitude: { not: null, gte: south, lte: north },
        longitude: { not: null, gte: west, lte: east },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
    });

    return rows
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        id: r.id,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
      }));
  }

  public async getListingsByIds(ids: string[]): Promise<TravelListingItem[]> {
    if (ids.length === 0) return [];

    const rows = await this.prisma.listing.findMany({
      where: { id: { in: ids } },
      include: {
        images: { orderBy: { order: 'asc' }, take: 5 },
        amenities: { include: { amenity: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      city: row.city,
      country: row.country,
      price: toNum(row.pricePerNight),
      rating: row.rating,
      trustScore: row.trustScore ?? 0,
      amenities: row.amenities.map((a) => a.amenity.name),
      images: row.images.map((img) => ({
        id: img.id,
        url: img.url,
        thumbnailUrl: img.thumbnailUrl,
      })),
      latitude: Number(row.latitude ?? 0),
      longitude: Number(row.longitude ?? 0),
    }));
  }
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'toNumber' in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  return null;
}
