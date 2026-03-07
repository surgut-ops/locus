export type AssignAmenitiesBody = {
  amenityIds: string[];
};

export const AMENITY_CATEGORIES = [
  'internet',
  'kitchen',
  'comfort',
  'entertainment',
  'safety',
] as const;

export type AmenityCategory = (typeof AMENITY_CATEGORIES)[number];

export type CreateAmenityDto = {
  name: string;
  icon: string | null;
  category: AmenityCategory;
};

export class AmenitiesError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AmenitiesError';
    this.statusCode = statusCode;
  }
}
