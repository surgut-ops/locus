import { randomUUID } from 'node:crypto';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export type StorageUploadInput = {
  key?: string;
  folder: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export type StorageUploadResult = {
  key: string;
  url: string;
};

export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string | null;
  private readonly endpoint: string | null;

  public constructor() {
    const endpoint =
      process.env.R2_ENDPOINT ??
      process.env.CLOUDFLARE_R2_ENDPOINT ??
      process.env.STORAGE_ENDPOINT ??
      null;
    const bucket =
      process.env.R2_BUCKET ??
      process.env.CLOUDFLARE_R2_BUCKET ??
      process.env.STORAGE_BUCKET ??
      '';
    const accessKeyId =
      process.env.R2_ACCESS_KEY ??
      process.env.CLOUDFLARE_R2_KEY ??
      process.env.STORAGE_ACCESS_KEY_ID ??
      '';
    const secretAccessKey =
      process.env.R2_SECRET_KEY ??
      process.env.CLOUDFLARE_R2_SECRET ??
      process.env.STORAGE_SECRET_ACCESS_KEY ??
      '';

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Storage (R2) not configured: R2_BUCKET, R2_ACCESS_KEY, R2_SECRET_KEY required',
      );
    }

    this.bucket = bucket;
    this.endpoint = endpoint;
    this.publicBaseUrl =
      process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL ??
      process.env.STORAGE_PUBLIC_BASE_URL ??
      null;

    this.client = new S3Client({
      region: 'auto',
      endpoint: endpoint ?? undefined,
      forcePathStyle: Boolean(endpoint),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  public async uploadFile(input: StorageUploadInput): Promise<StorageUploadResult> {
    const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key =
      input.key ??
      `${input.folder}/${Date.now()}-${randomUUID()}-${safeFilename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );

    return { key, url: this.getPublicUrl(key) };
  }

  public async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  public getPublicUrl(key: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
    }
    if (this.endpoint) {
      return `${this.endpoint.replace(/\/+$/, '')}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.r2.cloudflarestorage.com/${key}`;
  }
}
