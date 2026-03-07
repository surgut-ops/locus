import { ListingStatus } from '@prisma/client';

import type { AuthenticatedUser } from '../../utils/auth.js';
import { assertModeratorOrAdmin } from '../../utils/auth.js';
import { AdminListingsRepository } from './admin-listings.repository.js';

export class AdminListingsError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AdminListingsError';
    this.statusCode = statusCode;
  }
}

export class AdminListingsService {
  public constructor(private readonly repository: AdminListingsRepository) {}

  public async getPendingListings(actor: AuthenticatedUser) {
    assertModeratorOrAdmin(actor);
    return this.repository.getPendingListings();
  }

  public async approveListing(actor: AuthenticatedUser, listingId: string) {
    assertModeratorOrAdmin(actor);
    assertId(listingId, 'Listing id is required');

    const listing = await this.repository.getListingById(listingId);
    if (!listing) {
      throw new AdminListingsError('Listing not found', 404);
    }

    return this.repository.setListingStatus(listingId, ListingStatus.PUBLISHED);
  }

  public async rejectListing(actor: AuthenticatedUser, listingId: string) {
    assertModeratorOrAdmin(actor);
    assertId(listingId, 'Listing id is required');

    const listing = await this.repository.getListingById(listingId);
    if (!listing) {
      throw new AdminListingsError('Listing not found', 404);
    }

    return this.repository.setListingStatus(listingId, ListingStatus.DRAFT);
  }
}

function assertId(value: string, message: string): void {
  if (!value || !value.trim()) {
    throw new AdminListingsError(message, 400);
  }
}
