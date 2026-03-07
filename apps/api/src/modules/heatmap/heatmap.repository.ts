import { BookingStatus, ListingStatus, UserActivityAction, type PrismaClient } from '@prisma/client';

export type DistrictRawRow = {
  district: string;
  averagePrice: number;
  listingCount: number;
  bookingsCount: number;
  viewsCount: number;
  avgLat: number | null;
  avgLng: number | null;
};

export class HeatmapRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getDistrictStatsByCity(city: string): Promise<DistrictRawRow[]> {
    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        city: { equals: city, mode: 'insensitive' },
        pricePerNight: { not: null },
      },
      select: {
        id: true,
        district: true,
        pricePerNight: true,
        latitude: true,
        longitude: true,
      },
    });

    const districtKey = (d: string | null) =>
      d && d.trim() ? d.trim() : '__unknown__';
    const byDistrict = new Map<
      string,
      {
        prices: number[];
        listingIds: string[];
        latSum: number;
        lngSum: number;
        latCount: number;
        lngCount: number;
      }
    >();

    for (const l of listings) {
      const key = districtKey(l.district);
      const price = Number(l.pricePerNight ?? 0);
      if (price <= 0) continue;

      const existing = byDistrict.get(key);
      if (!existing) {
        byDistrict.set(key, {
          prices: [price],
          listingIds: [l.id],
          latSum: Number(l.latitude ?? 0),
          lngSum: Number(l.longitude ?? 0),
          latCount: l.latitude != null ? 1 : 0,
          lngCount: l.longitude != null ? 1 : 0,
        });
      } else {
        existing.prices.push(price);
        existing.listingIds.push(l.id);
        if (l.latitude != null) {
          existing.latSum += Number(l.latitude);
          existing.latCount++;
        }
        if (l.longitude != null) {
          existing.lngSum += Number(l.longitude);
          existing.lngCount++;
        }
      }
    }

    const allListingIds = listings.map((l) => l.id);
    const [bookingsByListing, viewsByListing] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['listingId'],
        where: {
          listingId: { in: allListingIds },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
        _count: { id: true },
      }),
      this.prisma.userActivity.groupBy({
        by: ['listingId'],
        where: {
          listingId: { in: allListingIds },
          action: UserActivityAction.VIEW,
        },
        _count: { id: true },
      }),
    ]);

    const bookingsMap = new Map(
      bookingsByListing.map((b) => [b.listingId, b._count.id]),
    );
    const viewsMap = new Map(viewsByListing.map((v) => [v.listingId, v._count.id]));

    const rows: DistrictRawRow[] = [];
    for (const [key, data] of byDistrict.entries()) {
      let bookingsCount = 0;
      let viewsCount = 0;
      for (const id of data.listingIds) {
        bookingsCount += bookingsMap.get(id) ?? 0;
        viewsCount += viewsMap.get(id) ?? 0;
      }

      const avgPrice =
        data.prices.length > 0
          ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length
          : 0;

      const avgLat =
        data.latCount > 0 ? data.latSum / data.latCount : null;
      const avgLng =
        data.lngCount > 0 ? data.lngSum / data.lngCount : null;

      rows.push({
        district: key === '__unknown__' ? 'Other' : key,
        averagePrice: avgPrice,
        listingCount: data.listingIds.length,
        bookingsCount,
        viewsCount,
        avgLat: avgLat !== 0 ? avgLat : null,
        avgLng: avgLng !== 0 ? avgLng : null,
      });
    }

    return rows;
  }
}
