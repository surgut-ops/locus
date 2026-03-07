# LOCUS Database Schema

## Overview

Database schema is defined in `prisma/schema.prisma` and uses:

- PostgreSQL datasource
- Prisma Client generator
- UUID primary keys
- `createdAt @default(now())`
- `updatedAt @updatedAt` where applicable

## Models

### User

- Purpose: identity, profile, role, moderation flags, platform-wide ownership.
- Important fields:
  - `email` (unique)
  - `role` (`GUEST | USER | HOST | MODERATOR | ADMIN`)
  - `isVerified`, `isBlocked`
  - quality fields: `rating`, `reviewCount`
- Relationships:
  - has many `Listing`, `Booking`, `Review`, `Favorite`, `Message`, `Payment`
  - participates in `Conversation` as guest/host

### Listing

- Purpose: core real-estate entity for rental/sale offers.
- Important fields:
  - `ownerId`, `type`, `status`
  - pricing: `pricePerNight`, `pricePerMonth`, `currency`
  - location: `city`, `district`, `country`, `address`, geo coordinates
  - capacity/property descriptors: rooms, area, maxGuests
- Relationships:
  - belongs to `User` (owner)
  - has many `ListingImage`, `ListingAmenity`, `Booking`, `Availability`, `Review`, `Favorite`, `Conversation`

### ListingImage

- Purpose: media records for listing gallery and ordering.
- Important fields:
  - `listingId`, `url`, `thumbnailUrl`, `width`, `height`, `order`
- Relationships:
  - belongs to `Listing`

### Amenity

- Purpose: amenity dictionary (wifi, pool, kitchen, etc.).
- Important fields:
  - `name` (unique), `icon`, `category`, `createdAt`
- Relationships:
  - many-to-many with listings via `ListingAmenity`

### ListingAmenity

- Purpose: join table for listing <-> amenity mapping.
- Important fields:
  - composite key: `@@id([listingId, amenityId])`
- Relationships:
  - belongs to `Listing`
  - belongs to `Amenity`

### Booking

- Purpose: reservation contract between guest and listing.
- Important fields:
  - `listingId`, `guestId`
  - `status` (`PENDING | CONFIRMED | CANCELLED | COMPLETED`)
  - `startDate`, `endDate`, `totalPrice`, `currency`
- Relationships:
  - belongs to `Listing`
  - belongs to `User` (guest)
  - has many `Payment`

### Availability

- Purpose: calendar override per listing date (availability + custom price).
- Important fields:
  - `listingId`, `date`, `isAvailable`, `priceOverride`
  - unique pair: `@@unique([listingId, date])`
- Relationships:
  - belongs to `Listing`

### Review

- Purpose: listing feedback and score authored by users.
- Important fields:
  - `listingId`, `authorId`
  - `rating` (`SmallInt`, intended 1-5)
  - `comment`
- Relationships:
  - belongs to `Listing`
  - belongs to `User` (author)

### Favorite

- Purpose: user saved listings.
- Important fields:
  - `userId`, `listingId`
  - unique pair: `@@unique([userId, listingId])`
- Relationships:
  - belongs to `User`
  - belongs to `Listing`

### Conversation

- Purpose: chat thread scoped to listing and guest/host pair.
- Important fields:
  - `listingId`, `guestId`, `hostId`
  - `updatedAt` for ordering recency
- Relationships:
  - belongs to `Listing`
  - belongs to `User` (guest)
  - belongs to `User` (host)
  - has many `Message`

### Message

- Purpose: individual chat message in conversation.
- Important fields:
  - `conversationId`, `senderId`, `text`, `createdAt`
- Relationships:
  - belongs to `Conversation`
  - belongs to `User` (sender)

### Payment

- Purpose: booking transaction record.
- Important fields:
  - `bookingId`, `userId`, `amount`, `currency`
  - `status` (`PENDING | SUCCEEDED | FAILED | REFUNDED`)
  - `provider` (e.g. stripe)
- Relationships:
  - belongs to `Booking`
  - belongs to `User`

### UserActivity

- Purpose: stores user behavior events for recommendation personalization.
- Important fields:
  - `userId`, `listingId?`
  - `action` (`VIEW | SEARCH | BOOK`)
  - `createdAt`
- Relationships:
  - belongs to `User`
  - optionally belongs to `Listing` (for listing-related actions)

## Key Relationships

- `User -> Listings` through `Listing.ownerId`
- `User -> Bookings` through `Booking.guestId`
- `Listing -> Images` through `ListingImage.listingId`
- `Listing -> Amenities` through `ListingAmenity`
- `Listing -> Reviews` through `Review.listingId`
- `Listing -> Bookings` through `Booking.listingId`
- `Conversation -> Messages` through `Message.conversationId`
- `Booking -> Payment` through `Payment.bookingId` (one-to-many schema)
- `User -> UserActivity` through `UserActivity.userId`
- `Listing -> UserActivity` through optional `UserActivity.listingId`

## Indexes and Performance

Important indexes configured in schema:

- `User`: `@@index([email])`
- `Listing`: `@@index([city])`, `@@index([ownerId])`
- `Booking`: `@@index([listingId])`, `@@index([guestId])`
- `Review`: `@@index([listingId])`, `@@index([authorId])`
- `Favorite`: `@@index([userId])`, `@@index([listingId])`
- `Payment`: `@@index([bookingId])`, `@@index([userId])`
- `UserActivity`: `@@index([userId, createdAt])`, `@@index([action, createdAt])`, `@@index([listingId])`
- plus message/conversation/listing-image/access-supporting indexes

These indexes support high-frequency access paths for:

- search/filter by city and host ownership
- booking and payment history lookups
- messaging timelines
- favorites and review aggregations
