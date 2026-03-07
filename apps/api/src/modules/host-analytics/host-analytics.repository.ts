import {
  BookingStatus,
  ListingStatus,
  PaymentStatus,
  type PrismaClient,
} from '@prisma/client';

const MONTHS_BACK = 12;

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null && 'toNumber' in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  return 0;
}

export class HostAnalyticsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getHostListingIds(hostId: string): Promise<string[]> {
    const rows = await this.prisma.listing.findMany({
      where: { ownerId: hostId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  public async getTotalRevenue(hostId: string): Promise<number> {
    const listingIds = await this.getHostListingIds(hostId);
    if (listingIds.length === 0) return 0;

    const result = await this.prisma.payment.aggregate({
      where: {
        status: PaymentStatus.SUCCEEDED,
        booking: {
          listingId: { in: listingIds },
        },
      },
      _sum: { amount: true },
    });

    return toNum(result._sum.amount);
  }

  public async getMonthlyRevenue(hostId: string): Promise<Array<{ month: string; year: number; revenue: number }>> {
    const listingIds = await this.getHostListingIds(hostId);
    if (listingIds.length === 0) return [];

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - MONTHS_BACK);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.SUCCEEDED,
        createdAt: { gte: startDate },
        booking: {
          listingId: { in: listingIds },
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    const byMonth = new Map<string, number>();
    for (const p of payments) {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + toNum(p.amount));
    }

    const result: Array<{ month: string; year: number; revenue: number }> = [];
    for (let i = 0; i < MONTHS_BACK; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        month: key,
        year: d.getFullYear(),
        revenue: Math.round((byMonth.get(key) ?? 0) * 100) / 100,
      });
    }
    result.sort((a, b) => a.month.localeCompare(b.month));
    return result;
  }

  public async getBookedNights(hostId: string, daysBack: number): Promise<number> {
    const listingIds = await this.getHostListingIds(hostId);
    if (listingIds.length === 0) return 0;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        listingId: { in: listingIds },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        endDate: { gte: startDate },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    let nights = 0;
    for (const b of bookings) {
      const start = new Date(b.startDate).getTime();
      const end = new Date(b.endDate).getTime();
      const msPerDay = 86400000;
      nights += Math.max(0, Math.ceil((end - start) / msPerDay));
    }
    return nights;
  }

  public async getAvailableNights(hostId: string, daysBack: number): Promise<number> {
    const listingIds = await this.getHostListingIds(hostId);
    if (listingIds.length === 0) return 0;
    return listingIds.length * daysBack;
  }

  public async getMonthlyBookings(
    hostId: string,
  ): Promise<Array<{ month: string; year: number; count: number }>> {
    const listingIds = await this.getHostListingIds(hostId);
    if (listingIds.length === 0) return [];

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - MONTHS_BACK);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        listingId: { in: listingIds },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
    });

    const byMonth = new Map<string, number>();
    for (const b of bookings) {
      const d = new Date(b.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }

    const result: Array<{ month: string; year: number; count: number }> = [];
    for (let i = 0; i < MONTHS_BACK; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        month: key,
        year: d.getFullYear(),
        count: byMonth.get(key) ?? 0,
      });
    }
    result.sort((a, b) => a.month.localeCompare(b.month));
    return result;
  }

  public async getListingsWithPrices(hostId: string): Promise<
    Array<{
      id: string;
      title: string;
      pricePerNight: number;
      city: string;
      district: string | null;
      status: ListingStatus;
    }>
  > {
    const rows = await this.prisma.listing.findMany({
      where: { ownerId: hostId },
      select: {
        id: true,
        title: true,
        pricePerNight: true,
        city: true,
        district: true,
        status: true,
      },
    });

    return rows
      .filter((r) => r.pricePerNight != null && toNum(r.pricePerNight) > 0)
      .map((r) => ({
        id: r.id,
        title: r.title,
        pricePerNight: toNum(r.pricePerNight),
        city: r.city,
        district: r.district,
        status: r.status,
      }));
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
    });

    return toNum(agg._avg.pricePerNight);
  }
}
