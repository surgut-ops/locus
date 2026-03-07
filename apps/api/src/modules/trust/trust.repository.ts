import type { PrismaClient } from '@prisma/client';

export class TrustRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getUserForTrust(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        emailVerified: true,
        phoneVerified: true,
        identityVerified: true,
        trustScore: true,
        rating: true,
        reviewCount: true,
      },
    });
  }

  public async getListingForTrust(listingId: string) {
    return this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        owner: {
          select: {
            id: true,
            trustScore: true,
            emailVerified: true,
            phoneVerified: true,
            identityVerified: true,
            rating: true,
            reviewCount: true,
          },
        },
        images: {
          select: { id: true, verified: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });
  }
}
