export type UploadMediaFile = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export type ListingImageProcessingPayload = {
  listingId: string;
  imageId: string;
  imageUrl: string;
  mimeType?: string;
  sourceBufferBase64?: string;
};

export class ListingMediaError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ListingMediaError';
    this.statusCode = statusCode;
  }
}
