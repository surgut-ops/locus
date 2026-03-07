import { BookingStatus, Prisma, type PrismaClient } from '@prisma/client';

export class ReviewsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listingExists(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    return Boolean(listing);
  }

  public async getListingOwnerId(listingId: string): Promise<string | null> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerId: true },
    });
    return listing?.ownerId ?? null;
  }

  public async countCompletedBookingsForListing(authorId: string, listingId: string) {
    return this.prisma.booking.count({
      where: {
        guestId: authorId,
        listingId,
        status: BookingStatus.COMPLETED,
      },
    });
  }

  public async countAuthorReviewsForListing(authorId: string, listingId: string) {
    return this.prisma.review.count({
      where: {
        authorId,
        listingId,
      },
    });
  }

  public async createReviewAndRecalculateRating(data: {
    listingId: string;
    authorId: string;
    rating: number;
    comment: string | null;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        const review = await tx.review.create({
          data: {
            listingId: data.listingId,
            authorId: data.authorId,
            rating: data.rating,
            comment: data.comment,
          },
        });

        const stats = await tx.review.aggregate({
          where: { listingId: data.listingId },
          _avg: { rating: true },
          _count: { id: true },
        });

        await tx.listing.update({
          where: { id: data.listingId },
          data: {
            rating: stats._avg.rating ?? 0,
            reviewCount: stats._count.id,
          },
        });

        return review;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  public async getListingReviews(listingId: string, skip: number, take: number) {
    return this.prisma.review.findMany({
      where: { listingId },
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  public async countListingReviews(listingId: string) {
    return this.prisma.review.count({
      where: { listingId },
    });
  }
}
