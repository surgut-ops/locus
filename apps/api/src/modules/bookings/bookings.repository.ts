import { BookingStatus, Prisma, type PrismaClient } from '@prisma/client';

export class BookingsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getListingForBooking(listingId: string) {
    return this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        status: true,
        maxGuests: true,
        pricePerNight: true,
        pricePerMonth: true,
        currency: true,
        instantBooking: true,
      },
    });
  }

  public async getOverlappingBookings(listingId: string, startDate: Date, endDate: Date) {
    return this.prisma.booking.findMany({
      where: {
        listingId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
        startDate: {
          lt: endDate,
        },
        endDate: {
          gt: startDate,
        },
      },
      select: { id: true },
    });
  }

  public async getAvailabilityRange(listingId: string, startDate: Date, endDate: Date) {
    return this.prisma.availability.findMany({
      where: {
        listingId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  public async createBookingWithTransaction(data: {
    listingId: string;
    guestId: string;
    startDate: Date;
    endDate: Date;
    totalPrice: Prisma.Decimal;
    currency: string;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        const overlap = await tx.booking.findFirst({
          where: {
            listingId: data.listingId,
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
            },
            startDate: {
              lt: data.endDate,
            },
            endDate: {
              gt: data.startDate,
            },
          },
          select: { id: true },
        });

        if (overlap) {
          return null;
        }

        return tx.booking.create({
          data: {
            listingId: data.listingId,
            guestId: data.guestId,
            status: BookingStatus.PENDING,
            startDate: data.startDate,
            endDate: data.endDate,
            totalPrice: data.totalPrice,
            currency: data.currency,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  public async getUserName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    if (!user) return 'Гость';
    return `${user.firstName} ${user.lastName}`.trim() || 'Гость';
  }

  public async getUserEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  public async getBookingById(bookingId: string) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: {
          select: {
            id: true,
            ownerId: true,
            currency: true,
          },
        },
      },
    });
  }

  public async updateBookingStatus(bookingId: string, status: BookingStatus) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
  }

  public async blockDates(listingId: string, dates: Date[]) {
    await this.prisma.$transaction(
      dates.map((date) =>
        this.prisma.availability.upsert({
          where: {
            listingId_date: {
              listingId,
              date,
            },
          },
          update: {
            isAvailable: false,
          },
          create: {
            listingId,
            date,
            isAvailable: false,
          },
        }),
      ),
    );
  }

  public async getCalendar(listingId: string, from: Date, to: Date) {
    return this.prisma.availability.findMany({
      where: {
        listingId,
        date: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  public async getBookedRanges(listingId: string, from: Date, to: Date) {
    return this.prisma.booking.findMany({
      where: {
        listingId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
        startDate: {
          lt: to,
        },
        endDate: {
          gt: from,
        },
      },
      select: {
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  public async getOverlappingBookingsInRange(listingId: string, from: Date, to: Date) {
    return this.prisma.booking.findMany({
      where: {
        listingId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
        startDate: {
          lt: to,
        },
        endDate: {
          gt: from,
        },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });
  }

  public async getMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { guestId: userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            country: true,
            ownerId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async getHostBookings(hostId: string) {
    return this.prisma.booking.findMany({
      where: {
        listing: {
          ownerId: hostId,
        },
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            country: true,
            ownerId: true,
          },
        },
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
