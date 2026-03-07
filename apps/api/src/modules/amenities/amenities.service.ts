import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../../utils/auth.js';
import { AmenitiesRepository } from './amenities.repository.js';
import {
  AMENITY_CATEGORIES,
  type AmenityCategory,
  AmenitiesError,
  type CreateAmenityDto,
} from './amenities.types.js';

export class AmenitiesService {
  public constructor(private readonly repository: AmenitiesRepository) {}

  public async createAmenity(actor: AuthenticatedUser, payload: unknown) {
    this.assertAdmin(actor);
    const dto = parseCreateAmenity(payload);
    const existing = await this.repository.findAmenityByName(dto.name);
    if (existing) {
      throw new AmenitiesError('Amenity with this name already exists', 409);
    }
    return this.repository.createAmenity(dto);
  }

  public async getAmenities() {
    return this.repository.getAllAmenities();
  }

  public async getListingAmenities(listingId: string) {
    assertId(listingId, 'Listing id is required');
    const amenities = await this.repository.getListingAmenities(listingId);
    return amenities.map((item) => item.amenity);
  }

  public async assignAmenities(actor: AuthenticatedUser, listingId: string, payload: unknown) {
    assertId(listingId, 'Listing id is required');
    const amenityIds = parseAmenityIds(payload);
    await this.assertListingOwner(actor, listingId);

    const existing = await this.repository.findAmenitiesByIds(amenityIds);
    const existingIds = new Set(existing.map((item) => item.id));
    const missingIds = amenityIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new AmenitiesError(`Amenity ids not found: ${missingIds.join(', ')}`, 400);
    }

    await this.repository.assignAmenitiesToListing(listingId, amenityIds);
    const assigned = await this.repository.getListingAmenities(listingId);

    return {
      listingId,
      amenities: assigned.map((item) => item.amenity),
    };
  }

  public async removeAmenity(actor: AuthenticatedUser, listingId: string, amenityId: string) {
    assertId(listingId, 'Listing id is required');
    assertId(amenityId, 'Amenity id is required');
    await this.assertListingOwner(actor, listingId);

    const result = await this.repository.removeAmenityFromListing(listingId, amenityId);
    if (result.count === 0) {
      throw new AmenitiesError('Amenity assignment not found', 404);
    }

    return { success: true };
  }

  private async assertListingOwner(actor: AuthenticatedUser, listingId: string) {
    const ownerId = await this.repository.getListingOwnerId(listingId);
    if (!ownerId) {
      throw new AmenitiesError('Listing not found', 404);
    }
    if (ownerId !== actor.id) {
      throw new AmenitiesError('Only listing owner can manage amenities', 403);
    }
  }

  private assertAdmin(actor: AuthenticatedUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw new AmenitiesError('Only admin can create amenities', 403);
    }
  }
}

function assertId(value: string, message: string): void {
  if (!value || !value.trim()) {
    throw new AmenitiesError(message, 400);
  }
}

function parseAmenityIds(payload: unknown): string[] {
  let value: unknown;

  if (Array.isArray(payload)) {
    value = payload;
  } else if (isObject(payload) && 'amenityIds' in payload) {
    value = payload.amenityIds;
  } else {
    throw new AmenitiesError('Body must be an array of amenity ids or { amenityIds: [] }', 400);
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw new AmenitiesError('Amenity ids must be a non-empty array', 400);
  }

  const ids = value.map((item) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new AmenitiesError('Each amenity id must be a non-empty string', 400);
    }
    return item.trim();
  });

  return [...new Set(ids)];
}

function parseCreateAmenity(payload: unknown): CreateAmenityDto {
  if (!isObject(payload)) {
    throw new AmenitiesError('Invalid request body', 400);
  }

  return {
    name: requireString(payload.name, 'name'),
    icon: optionalString(payload.icon),
    category: parseCategory(payload.category),
  };
}

function parseCategory(value: unknown): AmenityCategory {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AmenitiesError('Field "category" is required', 400);
  }
  const normalized = value.trim().toLowerCase();
  if (!AMENITY_CATEGORIES.includes(normalized as AmenityCategory)) {
    throw new AmenitiesError(
      `Field "category" must be one of: ${AMENITY_CATEGORIES.join(', ')}`,
      400,
    );
  }
  return normalized as AmenityCategory;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AmenitiesError(`Field "${field}" is required`, 400);
  }
  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new AmenitiesError('Field "icon" must be a string', 400);
  }
  return value.trim() || null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
