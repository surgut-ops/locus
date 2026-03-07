import { randomUUID } from 'node:crypto';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { getQueueService } from '../infrastructure/queue/queue.service.js';
import type { AuthenticatedUser } from '../../utils/auth.js';
import { ListingMediaRepository } from './media.repository.js';
import { ListingMediaError, type ListingImageProcessingPayload, type UploadMediaFile } from './media.types.js';

type StorageUploadInput = {
  listingId: string;
  folder: 'original' | 'optimized' | 'thumbnail';
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

const MAX_IMAGE_BYTES = Number(process.env.LISTING_IMAGE_MAX_BYTES ?? 10 * 1024 * 1024);

export class ListingMediaStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string | null;
  private readonly publicBaseUrl: string | null;

  private readonly configured: boolean;

  public constructor() {
    const bucket =
      process.env.STORAGE_BUCKET ?? process.env.CLOUDFLARE_R2_BUCKET ?? process.env.S3_BUCKET ?? '';
    const accessKeyId =
      process.env.STORAGE_ACCESS_KEY_ID ?? process.env.CLOUDFLARE_R2_KEY ?? process.env.S3_ACCESS_KEY_ID ?? '';
    const secretAccessKey =
      process.env.STORAGE_SECRET_ACCESS_KEY ??
      process.env.CLOUDFLARE_R2_SECRET ??
      process.env.S3_SECRET_ACCESS_KEY ??
      '';
    const endpoint = process.env.STORAGE_ENDPOINT ?? process.env.CLOUDFLARE_R2_ENDPOINT ?? process.env.S3_ENDPOINT;
    const region = process.env.STORAGE_REGION ?? process.env.S3_REGION ?? 'auto';

    this.configured = Boolean(bucket && accessKeyId && secretAccessKey);

    this.bucket = this.configured ? bucket : '';
    this.endpoint = endpoint ?? null;
    this.publicBaseUrl =
      process.env.STORAGE_PUBLIC_BASE_URL ?? process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL ?? null;
    this.client = this.configured
      ? new S3Client({
          region,
          endpoint,
          forcePathStyle: Boolean(endpoint),
          credentials: { accessKeyId, secretAccessKey },
        })
      : (null as unknown as S3Client);
  }

  public async upload(input: StorageUploadInput): Promise<{ key: string; url: string }> {
    if (!this.configured) {
      throw new ListingMediaError('Storage not configured. Set STORAGE_BUCKET/CLOUDFLARE_R2_* or S3_* env vars.', 503);
    }
    const safeFilename = sanitizeFilename(input.filename);
    const key = `listings/${input.listingId}/${input.folder}/${Date.now()}-${randomUUID()}-${safeFilename}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );
    return { key, url: this.buildObjectUrl(key) };
  }

  public async deleteByUrl(url: string): Promise<void> {
    if (!this.configured) return;
    const key = this.extractKeyFromUrl(url);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  private buildObjectUrl(key: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }
    if (this.endpoint) {
      return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  private extractKeyFromUrl(url: string): string {
    if (this.publicBaseUrl && url.startsWith(this.publicBaseUrl)) {
      return url.slice(this.publicBaseUrl.length).replace(/^\/+/, '');
    }
    const parsed = new URL(url);
    const prefix = `/${this.bucket}/`;
    if (parsed.pathname.startsWith(prefix)) {
      return parsed.pathname.slice(prefix.length);
    }
    return parsed.pathname.replace(/^\/+/, '');
  }
}

export class ListingMediaService {
  public constructor(
    private readonly repository: ListingMediaRepository,
    private readonly storage: ListingMediaStorage,
  ) {}

  public async uploadImage(actor: AuthenticatedUser, listingId: string, file: UploadMediaFile) {
    assertId(listingId, 'Listing id is required');
    this.assertFile(file);
    await this.assertListingOwner(actor.id, listingId);

    const currentMaxOrder = await this.repository.getLastOrder(listingId);
    const uploaded = await this.storage.upload({
      listingId,
      folder: 'original',
      filename: file.filename,
      mimeType: file.mimeType,
      buffer: file.buffer,
    });

    const image = await this.repository.createListingImage({
      listingId,
      url: uploaded.url,
      order: currentMaxOrder + 1,
    });

    const queue = getQueueService();
    if (queue) {
      await queue.addImageProcessingJob({
        listingId,
        imageId: image.id,
        imageUrl: image.url,
        mimeType: file.mimeType,
        sourceBufferBase64: file.buffer.toString('base64'),
      });
    }

    return image;
  }

  public async listImages(listingId: string) {
    assertId(listingId, 'Listing id is required');
    return this.repository.getListingImages(listingId);
  }

  public async deleteImage(actor: AuthenticatedUser, imageId: string) {
    assertId(imageId, 'Image id is required');
    const image = await this.repository.getImageWithOwner(imageId);
    if (!image) {
      throw new ListingMediaError('Image not found', 404);
    }
    if (image.listing.ownerId !== actor.id) {
      throw new ListingMediaError('Only listing owner can delete image', 403);
    }

    await this.storage.deleteByUrl(image.url);
    if (image.thumbnailUrl) {
      await this.storage.deleteByUrl(image.thumbnailUrl);
    }

    await this.repository.deleteImage(imageId);
    return { success: true };
  }

  private assertFile(file: UploadMediaFile) {
    if (!file.mimeType.startsWith('image/')) {
      throw new ListingMediaError('File must be an image', 400);
    }
    if (file.buffer.byteLength === 0) {
      throw new ListingMediaError('Empty file is not allowed', 400);
    }
    if (file.buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new ListingMediaError(
        `File size exceeds limit ${MAX_IMAGE_BYTES} bytes`,
        413,
      );
    }
  }

  private async assertListingOwner(userId: string, listingId: string) {
    const ownerId = await this.repository.getListingOwnerId(listingId);
    if (!ownerId) {
      throw new ListingMediaError('Listing not found', 404);
    }
    if (ownerId !== userId) {
      throw new ListingMediaError('Only listing owner can upload images', 403);
    }
  }
}

export function assertImageProcessingPayload(
  payload: ListingImageProcessingPayload,
): ListingImageProcessingPayload {
  assertId(payload.imageId, 'Image id is required');
  assertId(payload.listingId, 'Listing id is required');
  assertNonEmpty(payload.imageUrl, 'Image URL is required');
  return payload;
}

function assertId(value: string, message: string) {
  if (!value || !value.trim()) {
    throw new ListingMediaError(message, 400);
  }
}

function assertNonEmpty(value: string, message: string) {
  if (!value || !value.trim()) {
    throw new ListingMediaError(message, 400);
  }
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}
