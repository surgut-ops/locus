import { randomUUID } from 'node:crypto';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type UploadInput = {
  listingId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

type UploadedObject = {
  key: string;
  url: string;
};

export class ImagesStorage {
  private readonly client: S3Client;
  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly publicBaseUrl: string | null;

  public constructor() {
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
    const key = process.env.CLOUDFLARE_R2_KEY;
    const secret = process.env.CLOUDFLARE_R2_SECRET;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET;

    if (!endpoint || !key || !secret || !bucket) {
      throw new Error(
        'Missing R2 configuration: CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_KEY, CLOUDFLARE_R2_SECRET, CLOUDFLARE_R2_BUCKET',
      );
    }

    this.endpoint = endpoint;
    this.bucket = bucket;
    this.publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL ?? null;
    this.client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: key,
        secretAccessKey: secret,
      },
    });
  }

  public async uploadListingImage(input: UploadInput): Promise<UploadedObject> {
    const safeFilename = sanitizeFilename(input.filename);
    const key = `listings/${input.listingId}/${Date.now()}-${randomUUID()}-${safeFilename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );

    return {
      key,
      url: this.buildObjectUrl(key),
    };
  }

  public async deleteByUrl(url: string): Promise<void> {
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
    return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
  }

  private extractKeyFromUrl(url: string): string {
    if (this.publicBaseUrl && url.startsWith(this.publicBaseUrl)) {
      return url.slice(this.publicBaseUrl.length).replace(/^\/+/, '');
    }

    const parsed = new URL(url);
    const prefix = `/${this.bucket}/`;
    const path = parsed.pathname;

    if (path.startsWith(prefix)) {
      return path.slice(prefix.length);
    }

    return path.replace(/^\/+/, '');
  }
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}
