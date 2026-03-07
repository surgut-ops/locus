import type { ListingType } from '@prisma/client';

export type AiListingAnalyzeResponse = {
  title: string;
  description: string;
  amenities: string[];
  roomType: ListingType;
  suggestedPrice: number;
};

export class AiListingError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AiListingError';
    this.statusCode = statusCode;
  }
}
