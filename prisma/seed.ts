import bcrypt from 'bcrypt';
import {
  BookingStatus,
  ListingStatus,
  ListingType,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

const AMENITIES = [
  'WiFi',
  'Parking',
  'Air conditioning',
  'Kitchen',
  'Pool',
  'TV',
  'Washing machine',
  'Balcony',
  'Heating',
];

const CITIES: Array<{ city: string; country: string; district: string }> = [
  { city: 'Dubai', country: 'UAE', district: 'Marina' },
  { city: 'Bangkok', country: 'Thailand', district: 'Sukhumvit' },
  { city: 'London', country: 'UK', district: 'Canary Wharf' },
  { city: 'Paris', country: 'France', district: 'Le Marais' },
  { city: 'New York', country: 'USA', district: 'Manhattan' },
  { city: 'Istanbul', country: 'Turkey', district: 'Beyoglu' },
  { city: 'Berlin', country: 'Germany', district: 'Mitte' },
  { city: 'Barcelona', country: 'Spain', district: 'Eixample' },
  { city: 'Lisbon', country: 'Portugal', district: 'Baixa' },
  { city: 'Rome', country: 'Italy', district: 'Trastevere' },
];

const UNSPLASH_IMAGES = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858',
  'https://images.unsplash.com/photo-1494526585095-c41746248156',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
  'https://images.unsplash.com/photo-1572120360610-d971b9d7767c',
  'https://images.unsplash.com/photo-1460317442991-0ec209397118',
  'https://images.unsplash.com/photo-1507089947368-19c1da9775ae',
];

const REVIEW_COMMENTS = [
  'Very clean and comfortable place.',
  'Great host and smooth check-in.',
  'Perfect location, close to everything.',
  'Nice apartment with good amenities.',
  'Would definitely stay again.',
  'Good value for the price.',
  'Amazing view and cozy interior.',
  'Everything matched the description.',
];

async function main() {
  console.log('Starting seed...');

  await clearDatabase();
  const amenityRows = await createAmenities();
  const { hosts, users, defaultPassword } = await createUsers();
  const listings = await createListings(hosts);
  await createListingImages(listings);
  await attachAmenitiesToListings(listings, amenityRows);
  await createReviews(listings, users);
  await createBookings(listings, users);
  await recalculateListingRatings();
  await recalculateTrustScores();

  console.log('Seed completed.');
  console.log('Test accounts (password: ' + defaultPassword + '):');
  console.log('  Admin:  admin@locus.test');
  console.log('  Host:   host1@locus.test');
  console.log('  User:   user1@locus.test');
  console.log(`Hosts: ${hosts.length}, Users: ${users.length}, Listings: ${listings.length}`);
}

async function clearDatabase() {
  await prisma.complaint.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.userActivity.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.listingAmenity.deleteMany();
  await prisma.listingImage.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.user.deleteMany();
}

async function createAmenities() {
  await prisma.amenity.createMany({
    data: AMENITIES.map((name) => ({
      name,
      category: 'general',
    })),
    skipDuplicates: true,
  });

  return prisma.amenity.findMany({
    where: {
      name: { in: AMENITIES },
    },
  });
}

async function createUsers() {
  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const adminPayload = [
    {
      firstName: 'Admin',
      lastName: 'LOCUS',
      email: 'admin@locus.test',
      passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      identityVerified: true,
    },
  ];

  const hostPayload = Array.from({ length: 10 }, (_, index) => ({
    firstName: `Host${index + 1}`,
    lastName: 'LOCUS',
    email: `host${index + 1}@locus.test`,
    passwordHash,
    role: UserRole.HOST,
    isVerified: true,
    emailVerified: index < 3,
    phoneVerified: index < 2,
  }));

  const userPayload = Array.from({ length: 20 }, (_, index) => ({
    firstName: `User${index + 1}`,
    lastName: 'LOCUS',
    email: `user${index + 1}@locus.test`,
    passwordHash,
    role: UserRole.USER,
    isVerified: true,
  }));

  await prisma.user.createMany({ data: adminPayload, skipDuplicates: true });
  await prisma.user.createMany({ data: hostPayload, skipDuplicates: true });
  await prisma.user.createMany({ data: userPayload, skipDuplicates: true });

  const hosts = await prisma.user.findMany({
    where: { email: { startsWith: 'host' } },
    orderBy: { email: 'asc' },
  });
  const users = await prisma.user.findMany({
    where: { email: { startsWith: 'user' } },
    orderBy: { email: 'asc' },
  });

  return { hosts, users, defaultPassword };
}

async function createListings(hosts: Array<{ id: string }>) {
  const created: Array<{ id: string; ownerId: string; pricePerNight: Prisma.Decimal | null }> = [];

  for (let index = 0; index < 50; index += 1) {
    const host = hosts[index % hosts.length];
    const location = CITIES[index % CITIES.length];
    const rooms = randomInt(1, 5);
    const maxGuests = Math.max(1, rooms * 2);
    const nightly = new Prisma.Decimal(randomInt(40, 450));

    const listing = await prisma.listing.create({
      data: {
        ownerId: host.id,
        title: `${location.city} ${rooms}-room stay #${index + 1}`,
        description:
          'Modern and cozy property with stylish interior, great location, and everything needed for short or long stays.',
        type: randomItem(Object.values(ListingType)),
        status: ListingStatus.PUBLISHED,
        pricePerNight: nightly,
        currency: 'USD',
        city: location.city,
        district: location.district,
        country: location.country,
        address: `${100 + index} Main Street`,
        rooms,
        bedrooms: Math.max(1, rooms - 1),
        bathrooms: Math.max(1, Math.floor(rooms / 2)),
        maxGuests,
        area: new Prisma.Decimal(randomInt(35, 220)),
        checkInTime: '14:00',
        checkOutTime: '11:00',
        instantBooking: Math.random() > 0.4,
      },
      select: {
        id: true,
        ownerId: true,
        pricePerNight: true,
      },
    });

    created.push(listing);
  }

  return created;
}

async function createListingImages(listings: Array<{ id: string }>) {
  const images: Array<{
    listingId: string;
    url: string;
    thumbnailUrl: string;
    width: number;
    height: number;
    order: number;
  }> = [];

  for (const listing of listings) {
    const count = randomInt(3, 5);
    for (let order = 0; order < count; order += 1) {
      const base = UNSPLASH_IMAGES[(order + randomInt(0, UNSPLASH_IMAGES.length - 1)) % UNSPLASH_IMAGES.length];
      const signature = `${listing.id.slice(0, 8)}-${order}`;

      images.push({
        listingId: listing.id,
        url: `${base}?auto=format&fit=crop&w=1400&q=80&sig=${signature}`,
        thumbnailUrl: `${base}?auto=format&fit=crop&w=500&q=70&sig=${signature}`,
        width: 1400,
        height: 900,
        order,
      });
    }
  }

  await prisma.listingImage.createMany({ data: images });
}

async function attachAmenitiesToListings(
  listings: Array<{ id: string }>,
  amenities: Array<{ id: string }>,
) {
  const links: Array<{ listingId: string; amenityId: string }> = [];

  for (const listing of listings) {
    const chosen = pickUnique(amenities.map((item) => item.id), randomInt(4, 6));
    for (const amenityId of chosen) {
      links.push({ listingId: listing.id, amenityId });
    }
  }

  await prisma.listingAmenity.createMany({
    data: links,
    skipDuplicates: true,
  });
}

async function createReviews(
  listings: Array<{ id: string }>,
  users: Array<{ id: string }>,
) {
  const payload = Array.from({ length: 100 }, () => ({
    listingId: randomItem(listings).id,
    authorId: randomItem(users).id,
    rating: randomInt(3, 5),
    comment: randomItem(REVIEW_COMMENTS),
  }));

  await prisma.review.createMany({ data: payload });
}

async function createBookings(
  listings: Array<{ id: string; pricePerNight: Prisma.Decimal | null }>,
  users: Array<{ id: string }>,
) {
  const statuses = [
    BookingStatus.PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
    BookingStatus.COMPLETED,
  ];

  const payload = Array.from({ length: 30 }, () => {
    const listing = randomItem(listings);
    const guest = randomItem(users);

    const startOffsetDays = randomInt(1, 120);
    const duration = randomInt(2, 10);
    const startDate = addDays(new Date(), startOffsetDays);
    const endDate = addDays(startDate, duration);

    const nightly = listing.pricePerNight?.toNumber() ?? 80;
    const total = new Prisma.Decimal(Math.round(nightly * duration * 100) / 100);

    return {
      listingId: listing.id,
      guestId: guest.id,
      status: randomItem(statuses),
      startDate,
      endDate,
      totalPrice: total,
      currency: 'USD',
    };
  });

  await prisma.booking.createMany({ data: payload });
}

async function recalculateListingRatings() {
  const grouped = await prisma.review.groupBy({
    by: ['listingId'],
    _avg: { rating: true },
    _count: { listingId: true },
  });

  for (const item of grouped) {
    await prisma.listing.update({
      where: { id: item.listingId },
      data: {
        rating: item._avg.rating ?? 0,
        reviewCount: item._count.listingId,
      },
    });
  }
}

async function recalculateTrustScores() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      emailVerified: true,
      phoneVerified: true,
      identityVerified: true,
      rating: true,
      reviewCount: true,
    },
  });

  for (const user of users) {
    let score = 0;
    if (user.emailVerified) score += 10;
    if (user.phoneVerified) score += 15;
    if (user.identityVerified) score += 25;
    if (user.reviewCount > 0 && user.rating >= 4) score += 20;
    await prisma.user.update({
      where: { id: user.id },
      data: { trustScore: Math.min(100, score) },
    });
  }

  const listings = await prisma.listing.findMany({
    include: {
      owner: { select: { trustScore: true } },
      images: { select: { verified: true } },
      reviews: { select: { rating: true } },
    },
  });

  for (const listing of listings) {
    const ownerScore = Math.min(100, listing.owner.trustScore ?? 0);
    const avgRating =
      listing.reviews.length > 0
        ? listing.reviews.reduce((s, r) => s + r.rating, 0) / listing.reviews.length
        : 0;
    const reviewsScore = avgRating >= 4 ? 100 : Math.round((avgRating / 5) * 100);
    const verifiedCount = listing.images.filter((img) => img.verified).length;
    const photosScore = Math.min(verifiedCount * 25, 100);

    const trustScore = Math.min(
      100,
      Math.round(
        (ownerScore * 0.5) + (reviewsScore * 0.3) + (photosScore * 0.2),
      ),
    );

    await prisma.listing.update({
      where: { id: listing.id },
      data: { trustScore },
    });
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function pickUnique<T>(items: T[], count: number): T[] {
  const copy = [...items];
  const chosen: T[] = [];

  while (copy.length > 0 && chosen.length < count) {
    const idx = randomInt(0, copy.length - 1);
    chosen.push(copy[idx]);
    copy.splice(idx, 1);
  }

  return chosen;
}

function addDays(date: Date, days: number): Date {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
