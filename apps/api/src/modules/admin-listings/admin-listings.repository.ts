import { ListingStatus, type PrismaClient } from '@prisma/client';

export class AdminListingsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getPendingListings() {
    return this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
      },
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
          take: 3,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  public async getListingById(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
  }

  public async setListingStatus(id: string, status: ListingStatus) {
    return this.prisma.listing.update({
      where: { id },
      data: { status },
    });
  }
}
