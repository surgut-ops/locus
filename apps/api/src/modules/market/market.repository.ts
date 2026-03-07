import { BookingStatus, ListingStatus, type PrismaClient } from '@prisma/client';

import { UserActivityAction } from '@prisma/client';

export class MarketRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getListingForMarket(listingId: string) {
    return this.prisma.listing.findUnique({
      where: { id: listingId, status: ListingStatus.PUBLISHED },
      select: {
        id: true,
        city: true,
        district: true,
        type: true,
        pricePerNight: true,
        currency: true,
        title: true,
        description: true,
        rooms: true,
        maxGuests: true,
        rating: true,
        reviewCount: true,
      },
    });
  }

  public async getCityAveragePrice(city: string, district: string | null): Promise<number> {
    const where: Record<string, unknown> = {
      status: ListingStatus.PUBLISHED,
      city,
      pricePerNight: { not: null },
    };
    if (district?.trim()) {
      where.district = district.trim();
    }

    const agg = await this.prisma.listing.aggregate({
      where,
      _avg: { pricePerNight: true },
      _count: { id: true },
    });

    if (!agg._avg.pricePerNight || agg._count.id === 0) {
      const cityOnly = await this.prisma.listing.aggregate({
        where: {
          status: ListingStatus.PUBLISHED,
          city,
          pricePerNight: { not: null },
        },
        _avg: { pricePerNight: true },
      });
      return Number(cityOnly._avg.pricePerNight ?? 0);
    }
    return Number(agg._avg.pricePerNight);
  }

  public async getListingBookingsCount(listingId: string): Promise<number> {
    return this.prisma.booking.count({
      where: {
        listingId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
    });
  }

  public async getListingViewsCount(listingId: string): Promise<number> {
    return this.prisma.userActivity.count({
      where: {
        listingId,
        action: UserActivityAction.VIEW,
      },
    });
  }

  public async getDistrictDemandStats(city: string, district: string | null) {
    const where: Record<string, unknown> = {
      status: ListingStatus.PUBLISHED,
      city,
    };
    if (district?.trim()) {
      where.district = district.trim();
    }

    const listings = await this.prisma.listing.findMany({
      where,
      select: { id: true },
    });
    const ids = listings.map((l) => l.id);
    if (ids.length === 0) {
      return { avgBookings: 0, avgViews: 0, maxBookings: 1, maxViews: 1, listingCount: 0 };
    }

    const [bookingsAgg, viewsAgg] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['listingId'],
        where: {
          listingId: { in: ids },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
        _count: { id: true },
      }),
      this.prisma.userActivity.groupBy({
        by: ['listingId'],
        where: {
          listingId: { in: ids },
          action: UserActivityAction.VIEW,
        },
        _count: { id: true },
      }),
    ]);

    const allBookings = Object.fromEntries(bookingsAgg.map((b) => [b.listingId, b._count.id]));
    const allViews = Object.fromEntries(viewsAgg.map((v) => [v.listingId, v._count.id]));

    let totalBookings = 0;
    let totalViews = 0;
    let maxBookings = 0;
    let maxViews = 0;
    for (const id of ids) {
      const b = allBookings[id] ?? 0;
      const v = allViews[id] ?? 0;
      totalBookings += b;
      totalViews += v;
      if (b > maxBookings) maxBookings = b;
      if (v > maxViews) maxViews = v;
    }

    const n = ids.length;
    return {
      avgBookings: n > 0 ? totalBookings / n : 0,
      avgViews: n > 0 ? totalViews / n : 0,
      maxBookings: Math.max(1, maxBookings),
      maxViews: Math.max(1, maxViews),
      listingCount: n,
    };
  }
}
