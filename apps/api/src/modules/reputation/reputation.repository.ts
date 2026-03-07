import { BookingStatus, type PrismaClient } from '@prisma/client';

export class ReputationRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getUserForReputation(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        reputationScore: true,
        rating: true,
        reviewCount: true,
      },
    });
  }

  public async getBookingStats(userId: string) {
    const asGuest = await this.prisma.booking.groupBy({
      by: ['status'],
      where: { guestId: userId },
      _count: { id: true },
    });

    const listings = await this.prisma.listing.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const listingIds = listings.map((l) => l.id);

    let asHost = { completed: 0, cancelled: 0, total: 0 };
    if (listingIds.length > 0) {
      const hostBookings = await this.prisma.booking.groupBy({
        by: ['status'],
        where: { listingId: { in: listingIds } },
        _count: { id: true },
      });
      asHost = hostBookings.reduce(
        (acc, row) => {
          if (row.status === BookingStatus.COMPLETED) acc.completed += row._count.id;
          else if (row.status === BookingStatus.CANCELLED) acc.cancelled += row._count.id;
          acc.total += row._count.id;
          return acc;
        },
        { completed: 0, cancelled: 0, total: 0 },
      );
    }

    const guestCompleted = asGuest.find((r) => r.status === BookingStatus.COMPLETED)?._count.id ?? 0;
    const guestCancelled = asGuest.find((r) => r.status === BookingStatus.CANCELLED)?._count.id ?? 0;
    const guestTotal = asGuest.reduce((s, r) => s + r._count.id, 0);

    return {
      asGuest: { completed: guestCompleted, cancelled: guestCancelled, total: guestTotal },
      asHost,
    };
  }

  public async getAvgResponseTimeMinutes(hostId: string): Promise<number | null> {
    const conversations = await this.prisma.conversation.findMany({
      where: { hostId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { senderId: true, createdAt: true },
        },
      },
    });

    const responseTimes: number[] = [];
    for (const conv of conversations) {
      const msgs = conv.messages;
      if (msgs.length < 2) continue;

      const firstGuestMsg = msgs.find((m) => m.senderId !== hostId);
      const firstHostMsg = msgs.find((m) => m.senderId === hostId);

      if (firstGuestMsg && firstHostMsg) {
        const guestTime = firstGuestMsg.createdAt.getTime();
        const hostTime = firstHostMsg.createdAt.getTime();
        if (hostTime > guestTime) {
          responseTimes.push((hostTime - guestTime) / (60 * 1000));
        }
      }
    }

    if (responseTimes.length === 0) return null;
    return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  }

  public async getComplaintCountAgainstUser(userId: string): Promise<number> {
    return this.prisma.complaint.count({
      where: { respondentId: userId },
    });
  }

  public async getReviewsForUser(userId: string): Promise<{ rating: number; comment: string | null }[]> {
    const asAuthor = await this.prisma.review.findMany({
      where: { authorId: userId },
      select: { rating: true, comment: true },
    });

    const listings = await this.prisma.listing.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const listingIds = listings.map((l) => l.id);

    let asHost: { rating: number; comment: string | null }[] = [];
    if (listingIds.length > 0) {
      asHost = await this.prisma.review.findMany({
        where: { listingId: { in: listingIds } },
        select: { rating: true, comment: true },
      });
    }

    return [...asAuthor, ...asHost];
  }

  public async updateUserReputationScore(userId: string, score: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { reputationScore: Math.min(100, Math.max(0, score)) },
    });
  }
}
