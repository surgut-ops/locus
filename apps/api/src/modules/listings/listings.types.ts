import { ListingType } from '@prisma/client';

export type CreateListingDto = {
  title: string;
  description: string;
  type: ListingType;
  price: number;
  currency: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  rooms: number | null;
  guests: number | null;
};

export type CoordinatesDto = {
  latitude: number;
  longitude: number;
};

export type UpdateListingDto = {
  title?: string;
  description?: string;
  price?: number;
  rooms?: number | null;
  guests?: number | null;
  city?: string;
  coordinates?: CoordinatesDto;
};

export type ListingsMapBoundsDto = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type ListingsMapItem = {
  id: string;
  title: string;
  price: number | null;
  latitude: number;
  longitude: number;
  image: string | null;
};

export class ListingsError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ListingsError';
    this.statusCode = statusCode;
  }
}
