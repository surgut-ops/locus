import { PaymentStatus, type ListingStatus, type PrismaClient } from '@prisma/client';

export class AdminRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        rating: true,
        createdAt: true,
        isBlocked: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        rating: true,
        createdAt: true,
        isBlocked: true,
      },
    });
  }

  public async setUserBlockedState(id: string, isBlocked: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isBlocked },
      select: {
        id: true,
        email: true,
        role: true,
        rating: true,
        createdAt: true,
        isBlocked: true,
      },
    });
  }

  public async getListings() {
    return this.prisma.listing.findMany({
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  public async getListingById(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        amenities: {
          include: { amenity: true },
        },
      },
    });
  }

  public async setListingStatus(id: string, status: ListingStatus) {
    return this.prisma.listing.update({
      where: { id },
      data: { status },
    });
  }

  public async getBookings() {
    return this.prisma.booking.findMany({
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            ownerId: true,
            city: true,
            country: true,
          },
        },
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async getBookingById(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            ownerId: true,
            city: true,
            country: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  public async getCounts() {
    const [usersCount, listingsCount, bookingsCount, activeListings] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.booking.count(),
      this.prisma.listing.count({
        where: { status: 'PUBLISHED' },
      }),
    ]);

    return { usersCount, listingsCount, bookingsCount, activeListings };
  }

  public async getRevenueEstimate() {
    const result = await this.prisma.booking.aggregate({
      _sum: { totalPrice: true },
      where: {
        status: {
          in: ['CONFIRMED', 'COMPLETED'],
        },
      },
    });
    return result._sum.totalPrice;
  }

  public async getTotalRevenue(): Promise<string> {
    const result = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.SUCCEEDED },
    });
    const val = result._sum.amount;
    return val ? val.toString() : '0';
  }

  public async getStats() {
    const [totalUsers, totalListings, totalBookings, totalRevenue] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.booking.count(),
      this.getTotalRevenue(),
    ]);
    return { totalUsers, totalListings, totalBookings, totalRevenue };
  }
}
