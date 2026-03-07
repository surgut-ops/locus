import { ListingStatus, type PrismaClient } from '@prisma/client';

export class SEOService {
  public constructor(private readonly prisma: PrismaClient) {}

  public generateCityMetadata(city: string) {
    const normalized = normalizeSegment(city);
    const title = `${city} Properties - LOCUS`;
    const description = `Discover rentals and properties in ${city}. AI-powered search, booking, and analytics on LOCUS.`;
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: `/city/${normalized}`,
    };
    return { title, description, structuredData };
  }

  public generateDistrictMetadata(city: string, district: string) {
    const title = `${district}, ${city} Real Estate - LOCUS`;
    const description = `Browse listings in ${district}, ${city} with AI recommendations and smart booking.`;
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: `/city/${normalizeSegment(city)}/district/${normalizeSegment(district)}`,
    };
    return { title, description, structuredData };
  }

  public generatePropertyMetadata(input: {
    id: string;
    title: string;
    city: string;
    country: string;
    pricePerNight: number | null;
    currency: string;
    description: string;
  }) {
    const title = `${input.title} in ${input.city} - LOCUS`;
    const description = input.description.slice(0, 155);
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'LodgingBusiness',
      name: input.title,
      description,
      address: {
        '@type': 'PostalAddress',
        addressLocality: input.city,
        addressCountry: input.country,
      },
      offers: input.pricePerNight
        ? {
            '@type': 'Offer',
            price: input.pricePerNight,
            priceCurrency: input.currency,
          }
        : undefined,
      url: `/listings/${input.id}`,
    };

    return { title, description, structuredData };
  }

  public async generateSitemapXml(baseUrl: string): Promise<string> {
    const listings = await this.prisma.listing.findMany({
      where: { status: ListingStatus.PUBLISHED },
      select: {
        id: true,
        updatedAt: true,
        city: true,
        district: true,
      },
      take: 50000,
    });

    const citySet = new Set<string>();
    const districtSet = new Set<string>();
    for (const listing of listings) {
      citySet.add(listing.city);
      if (listing.district) {
        districtSet.add(`${listing.city}|||${listing.district}`);
      }
    }

    const urls: Array<{ loc: string; lastmod?: string }> = [];
    urls.push({ loc: `${baseUrl}/` });
    for (const city of citySet) {
      urls.push({ loc: `${baseUrl}/city/${normalizeSegment(city)}` });
    }
    for (const item of districtSet) {
      const [city, district] = item.split('|||');
      urls.push({
        loc: `${baseUrl}/city/${normalizeSegment(city)}/district/${normalizeSegment(district)}`,
      });
    }
    for (const listing of listings) {
      urls.push({
        loc: `${baseUrl}/listings/${listing.id}`,
        lastmod: listing.updatedAt.toISOString(),
      });
    }

    const body = urls
      .map((item) => {
        const lastmod = item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : '';
        return `<url><loc>${escapeXml(item.loc)}</loc>${lastmod}</url>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
  }
}

function normalizeSegment(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
