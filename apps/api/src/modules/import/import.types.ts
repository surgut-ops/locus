import type { ListingType } from '@prisma/client';

export type RawListingInput = Record<string, unknown>;

export type NormalizedListing = {
  title: string;
  description: string;
  type: ListingType;
  price: number;
  currency: string;
  city: string;
  country: string;
  address: string;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rooms?: number | null;
  maxGuests?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  imageUrls?: string[];
  amenityNames?: string[];
};

export type ImportResult = {
  jobId: string;
  status: 'queued';
  message: string;
};

export type CsvImportPayload = {
  ownerId: string;
  csv: string;
};

export type JsonImportPayload = {
  ownerId: string;
  items: RawListingInput[];
};

export type UrlImportPayload = {
  ownerId: string;
  url: string;
};

export class ImportError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ImportError';
    this.statusCode = statusCode;
  }
}
