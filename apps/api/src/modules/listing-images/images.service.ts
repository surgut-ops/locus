import type { PrismaClient } from '@prisma/client';

import type { AuthenticatedUser } from '../../utils/auth.js';
import { ImagesStorage } from './images.storage.js';

type UploadFileInput = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export class ImagesError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ImagesError';
    this.statusCode = statusCode;
  }
}

export class ImagesService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: ImagesStorage,
  ) {}

  public async uploadListingImages(actor: AuthenticatedUser, listingId: string, files: UploadFileInput[]) {
    assertId(listingId, 'Listing id is required');
    if (files.length === 0) {
      throw new ImagesError('No files uploaded', 400);
    }

    await this.assertOwner(actor, listingId);

    const lastImage = await this.prisma.listingImage.findFirst({
      where: { listingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    let order = (lastImage?.order ?? -1) + 1;
    const created = [];

    for (const file of files) {
      if (!file.mimeType.startsWith('image/')) {
        throw new ImagesError(`Unsupported file type: ${file.mimeType}`, 400);
      }

      const uploaded = await this.storage.uploadListingImage({
        listingId,
        filename: file.filename,
        mimeType: file.mimeType,
        buffer: file.buffer,
      });

      const image = await this.prisma.listingImage.create({
        data: {
          listingId,
          url: uploaded.url,
          order,
        },
      });

      created.push(image);
      order += 1;
    }

    return {
      items: created,
      urls: created.map((item) => item.url),
    };
  }

  public async deleteImage(actor: AuthenticatedUser, imageId: string) {
    assertId(imageId, 'Image id is required');

    const image = await this.prisma.listingImage.findUnique({
      where: { id: imageId },
      include: {
        listing: {
          select: { ownerId: true },
        },
      },
    });

    if (!image) {
      throw new ImagesError('Image not found', 404);
    }

    if (image.listing.ownerId !== actor.id) {
      throw new ImagesError('Only listing owner can delete image', 403);
    }

    await this.storage.deleteByUrl(image.url);
    await this.prisma.listingImage.delete({ where: { id: imageId } });

    return { success: true };
  }

  public async updateImagePosition(actor: AuthenticatedUser, imageId: string, position: unknown) {
    assertId(imageId, 'Image id is required');
    const parsedPosition = parsePosition(position);

    const image = await this.prisma.listingImage.findUnique({
      where: { id: imageId },
      include: {
        listing: {
          select: { ownerId: true },
        },
      },
    });

    if (!image) {
      throw new ImagesError('Image not found', 404);
    }

    if (image.listing.ownerId !== actor.id) {
      throw new ImagesError('Only listing owner can change image position', 403);
    }

    return this.prisma.listingImage.update({
      where: { id: imageId },
      data: { order: parsedPosition },
    });
  }

  private async assertOwner(actor: AuthenticatedUser, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerId: true },
    });

    if (!listing) {
      throw new ImagesError('Listing not found', 404);
    }

    if (listing.ownerId !== actor.id) {
      throw new ImagesError('Only listing owner can upload images', 403);
    }
  }
}

function assertId(value: string, message: string): void {
  if (!value || !value.trim()) {
    throw new ImagesError(message, 400);
  }
}

function parsePosition(position: unknown): number {
  if (typeof position !== 'number' || !Number.isInteger(position) || position < 0) {
    throw new ImagesError('Position must be a non-negative integer', 400);
  }
  return position;
}
