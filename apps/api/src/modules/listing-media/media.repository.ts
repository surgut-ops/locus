import type { PrismaClient } from '@prisma/client';

export class ListingMediaRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getListingOwnerId(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerId: true },
    });
    return listing?.ownerId ?? null;
  }

  public async getLastOrder(listingId: string) {
    const last = await this.prisma.listingImage.findFirst({
      where: { listingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return last?.order ?? -1;
  }

  public async createListingImage(data: {
    listingId: string;
    url: string;
    order: number;
  }) {
    return this.prisma.listingImage.create({
      data: {
        listingId: data.listingId,
        url: data.url,
        order: data.order,
      },
    });
  }

  public async updateProcessedImage(data: {
    imageId: string;
    optimizedUrl: string;
    thumbnailUrl: string;
    width: number | null;
    height: number | null;
  }) {
    return this.prisma.listingImage.update({
      where: { id: data.imageId },
      data: {
        url: data.optimizedUrl,
        thumbnailUrl: data.thumbnailUrl,
        width: data.width,
        height: data.height,
      },
    });
  }

  public async getListingImages(listingId: string) {
    return this.prisma.listingImage.findMany({
      where: { listingId },
      orderBy: { order: 'asc' },
    });
  }

  public async getImageWithOwner(imageId: string) {
    return this.prisma.listingImage.findUnique({
      where: { id: imageId },
      include: {
        listing: {
          select: { ownerId: true },
        },
      },
    });
  }

  public async deleteImage(imageId: string) {
    return this.prisma.listingImage.delete({
      where: { id: imageId },
    });
  }
}
