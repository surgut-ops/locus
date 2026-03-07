import { ListingType } from '@prisma/client';

import type { AuthenticatedUser } from '../../utils/auth.js';
import { CACHE_TTL, CacheService } from '../infrastructure/cache/cache.service.js';
import { ListingsRepository } from './listings.repository.js';
import {
  type CreateListingDto,
  type ListingsMapBoundsDto,
  ListingsError,
  type ListingsMapItem,
  type UpdateListingDto,
} from './listings.types.js';

export class ListingsService {
  public constructor(
    private readonly repository: ListingsRepository,
    private readonly cache?: CacheService,
  ) {}

  public async createListing(actor: AuthenticatedUser, input: unknown) {
    const dto = validateCreateListingInput(input);
    return this.repository.createListing(actor.id, dto);
  }

  public async getListingById(id: string) {
    assertNonEmptyString(id, 'Listing id is required');

    const cacheKey = this.cache?.keys.listingDetails(id);
    if (this.cache && cacheKey) {
      const cached = await this.cache.get<unknown>(cacheKey);
      if (cached) return cached as Awaited<ReturnType<ListingsService['getListingById']>>;
    }

    const listing = await this.repository.getListingDetailsById(id);
    if (!listing) {
      throw new ListingsError('Listing not found', 404);
    }

    const result = {
      listing: {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.pricePerNight,
        currency: listing.currency,
        type: listing.type,
        city: listing.city,
        country: listing.country,
        latitude: listing.latitude,
        longitude: listing.longitude,
        rooms: listing.rooms,
        guests: listing.maxGuests,
        hostId: listing.ownerId,
        status: listing.status,
        trustScore: listing.trustScore ?? 0,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      },
      owner: listing.owner,
      images: listing.images,
      amenities: listing.amenities.map((item: { amenity: unknown }) => item.amenity),
      reviews: listing.reviews,
    };

    if (this.cache && cacheKey) {
      await this.cache.set(cacheKey, result, CACHE_TTL.LISTING_DETAILS);
    }
    return result;
  }

  public async updateListing(actor: AuthenticatedUser, listingId: string, input: unknown) {
    assertNonEmptyString(listingId, 'Listing id is required');
    await this.assertOwner(actor, listingId);
    const dto = validateUpdateListingInput(input);
    const result = await this.repository.updateListingById(listingId, dto);
    await this.cache?.invalidateListing(listingId);
    return result;
  }

  public async archiveListing(actor: AuthenticatedUser, listingId: string) {
    assertNonEmptyString(listingId, 'Listing id is required');
    await this.assertOwner(actor, listingId);
    const result = await this.repository.archiveListingById(listingId);
    await this.cache?.invalidateListing(listingId);
    return result;
  }

  public async getMyListings(actor: AuthenticatedUser, limit?: number, offset?: number) {
    return this.repository.getMyListings(actor.id, limit ?? 50, offset ?? 0);
  }

  public async getHostListingsByUserId(userId: string, limit?: number, offset?: number) {
    assertNonEmptyString(userId, 'User id is required');
    return this.repository.getHostListingsByUserId(userId, limit ?? 50, offset ?? 0);
  }

  public async getListingsForMap(query: unknown): Promise<ListingsMapItem[]> {
    const bounds = parseMapBoundsQuery(query);
    return this.repository.getListingsForMap(bounds);
  }

  private async assertOwner(actor: AuthenticatedUser, listingId: string) {
    const ownerId = await this.repository.getListingOwnerId(listingId);
    if (!ownerId) {
      throw new ListingsError('Listing not found', 404);
    }
    if (actor.id !== ownerId) {
      throw new ListingsError('Only listing owner can perform this action', 403);
    }
  }
}

function validateCreateListingInput(input: unknown): CreateListingDto {
  if (!isObject(input)) {
    throw new ListingsError('Invalid request body', 400);
  }

  return {
    title: requireString(input.title, 'title'),
    description: requireString(input.description, 'description'),
    type: optionalListingType(input.type),
    price: requirePositiveNumber(input.price, 'price'),
    currency: optionalStringWithDefault(input.currency, 'USD'),
    city: requireString(input.city, 'city'),
    country: optionalStringWithDefault(input.country, 'Unknown'),
    latitude: optionalNumber(input.latitude, 'latitude'),
    longitude: optionalNumber(input.longitude, 'longitude'),
    rooms: optionalInt(input.rooms, 'rooms'),
    guests: optionalInt(input.guests, 'guests'),
  };
}

function validateUpdateListingInput(input: unknown): UpdateListingDto {
  if (!isObject(input)) {
    throw new ListingsError('Invalid request body', 400);
  }

  const dto: UpdateListingDto = {};

  if ('title' in input) dto.title = requireString(input.title, 'title');
  if ('description' in input) dto.description = requireString(input.description, 'description');
  if ('price' in input) dto.price = requirePositiveNumber(input.price, 'price');
  if ('rooms' in input) dto.rooms = optionalInt(input.rooms, 'rooms');
  if ('guests' in input) dto.guests = optionalInt(input.guests, 'guests');
  if ('city' in input) dto.city = requireString(input.city, 'city');
  if ('coordinates' in input) dto.coordinates = requireCoordinates(input.coordinates);

  if (Object.keys(dto).length === 0) {
    throw new ListingsError('No fields provided for update', 400);
  }

  return dto;
}

function assertNonEmptyString(value: string, message: string): void {
  if (!value || !value.trim()) {
    throw new ListingsError(message, 400);
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ListingsError(`Field "${field}" is required`, 400);
  }
  return value.trim();
}

function optionalStringWithDefault(value: unknown, fallback: string): string {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new ListingsError('Expected a non-empty string value', 400);
  }
  return value.trim();
}

function optionalNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ListingsError(`Field "${field}" must be a number`, 400);
  }
  return value;
}

function requirePositiveNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ListingsError(`Field "${field}" must be a number`, 400);
  }
  if (value <= 0) {
    throw new ListingsError(`Field "${field}" must be greater than 0`, 400);
  }
  return value;
}

function optionalInt(value: unknown, field: string): number | null {
  const parsed = optionalNumber(value, field);
  if (parsed === null) {
    return null;
  }
  if (!Number.isInteger(parsed)) {
    throw new ListingsError(`Field "${field}" must be an integer`, 400);
  }
  if (parsed < 0) {
    throw new ListingsError(`Field "${field}" must be greater or equal to 0`, 400);
  }
  return parsed;
}

function optionalListingType(value: unknown): ListingType {
  if (value === undefined || value === null || value === '') {
    return ListingType.APARTMENT;
  }
  if (typeof value !== 'string') {
    throw new ListingsError('Field "type" must be a listing type', 400);
  }
  if (!Object.values(ListingType).includes(value as ListingType)) {
    throw new ListingsError('Field "type" has invalid value', 400);
  }
  return value as ListingType;
}

function requireCoordinates(value: unknown): { latitude: number; longitude: number } {
  if (!isObject(value)) {
    throw new ListingsError('Field "coordinates" must be an object', 400);
  }
  const latitude = requireCoordinate(value.latitude, 'latitude');
  const longitude = requireCoordinate(value.longitude, 'longitude');
  return { latitude, longitude };
}

function requireCoordinate(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ListingsError(`Field "${field}" must be a number`, 400);
  }
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseMapBoundsQuery(query: unknown): ListingsMapBoundsDto {
  if (!isObject(query)) {
    throw new ListingsError('Map bounds are required', 400);
  }

  const north = parseCoordinate(query.north, 'north');
  const south = parseCoordinate(query.south, 'south');
  const east = parseCoordinate(query.east, 'east');
  const west = parseCoordinate(query.west, 'west');

  if (north <= south) {
    throw new ListingsError('"north" must be greater than "south"', 400);
  }
  if (east <= west) {
    throw new ListingsError('"east" must be greater than "west"', 400);
  }

  return { north, south, east, west };
}

function parseCoordinate(value: unknown, field: string): number {
  const parsed =
    typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : Number.NaN;
  if (Number.isNaN(parsed)) {
    throw new ListingsError(`Query "${field}" must be a number`, 400);
  }
  return parsed;
}
