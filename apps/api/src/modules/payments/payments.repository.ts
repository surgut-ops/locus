import { BookingStatus, PaymentStatus, Prisma, type PrismaClient } from '@prisma/client';

export class PaymentsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getBookingById(bookingId: string) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: {
          select: {
            id: true,
            ownerId: true,
            title: true,
            currency: true,
          },
        },
      },
    });
  }

  public async getPaymentByBookingId(bookingId: string) {
    return this.prisma.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async createPendingPayment(data: {
    bookingId: string;
    userId: string;
    amount: Prisma.Decimal;
    currency: string;
    provider: string;
  }) {
    return this.prisma.payment.create({
      data: {
        bookingId: data.bookingId,
        userId: data.userId,
        amount: data.amount,
        currency: data.currency,
        status: PaymentStatus.PENDING,
        provider: data.provider,
      },
    });
  }

  public async updatePaymentStatusByBooking(bookingId: string, status: PaymentStatus) {
    const latest = await this.getPaymentByBookingId(bookingId);
    if (!latest) {
      return null;
    }
    return this.prisma.payment.update({
      where: { id: latest.id },
      data: { status },
    });
  }

  public async getPaymentById(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
  }

  public async updatePaymentStatusById(paymentId: string, status: PaymentStatus) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status },
    });
  }

  public async setBookingStatus(bookingId: string, status: BookingStatus) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
  }

  public async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      include: {
        booking: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            listing: {
              select: {
                id: true,
                title: true,
                city: true,
                country: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async getUserEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  public async getUserName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    if (!user) return 'Гость';
    return `${user.firstName} ${user.lastName}`.trim() || 'Гость';
  }

  public async getDuePayoutBookings(now: Date) {
    return this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        startDate: { lte: now },
        payments: {
          some: {
            status: PaymentStatus.SUCCEEDED,
          },
        },
      },
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
}
