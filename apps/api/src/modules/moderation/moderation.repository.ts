import { ModerationStatus, type PrismaClient } from '@prisma/client';

export class ModerationRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getListingForModeration(listingId: string) {
    return this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: { orderBy: { order: 'asc' } },
      },
    });
  }

  public async getSimilarListings(params: {
    title: string;
    city: string;
    type: string;
    ownerId: string;
    excludeId: string;
  }) {
    const firstWord = params.title.split(' ').filter(Boolean)[0] ?? '';
    return this.prisma.listing.findMany({
      where: {
        id: { not: params.excludeId },
        ownerId: { not: params.ownerId },
        city: params.city,
        type: params.type as 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM' | 'VILLA' | 'HOTEL',
        ...(firstWord
          ? {
              OR: [
                { title: { contains: firstWord, mode: 'insensitive' as const } },
                { description: { contains: firstWord, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      take: 20,
      select: { id: true, title: true, ownerId: true },
    });
  }

  public async getPendingListings() {
    return this.prisma.listing.findMany({
      where: { moderationStatus: ModerationStatus.PENDING_REVIEW },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        ownerId: true,
        moderationStatus: true,
        fraudScore: true,
        createdAt: true,
      },
    });
  }

  public async setModerationStatus(
    listingId: string,
    status: ModerationStatus,
  ) {
    return this.prisma.listing.update({
      where: { id: listingId },
      data: { moderationStatus: status },
    });
  }

  public async updateModerationResult(
    listingId: string,
    data: { moderationStatus: ModerationStatus; fraudScore: number },
  ) {
    return this.prisma.listing.update({
      where: { id: listingId },
      data,
    });
  }
}
