import { ListingType } from '@prisma/client';

import type { ImportJobPayload } from '../../queues/queue.js';
import { getQueueService } from '../infrastructure/queue/queue.service.js';
import { ImportRepository } from './import.repository.js';
import { type NormalizedListing, type RawListingInput } from './import.types.js';

const LISTING_TYPE_MAP: Record<string, ListingType> = {
  apartment: 'APARTMENT',
  house: 'HOUSE',
  studio: 'STUDIO',
  room: 'ROOM',
  villa: 'VILLA',
  hotel: 'HOTEL',
  APARTMENT: 'APARTMENT',
  HOUSE: 'HOUSE',
  STUDIO: 'STUDIO',
  ROOM: 'ROOM',
  VILLA: 'VILLA',
  HOTEL: 'HOTEL',
};

const KNOWN_AMENITIES = new Set([
  'WiFi', 'Parking', 'Air conditioning', 'Kitchen', 'Pool', 'TV',
  'Washing machine', 'Balcony', 'Heating', 'Bed',
]);

export class ImportService {
  public constructor(private readonly repository: ImportRepository) {}

  public async enqueueCsv(ownerId: string, csv: string): Promise<{ jobId: string }> {
    const queue = getQueueService();
    if (!queue) {
      throw new Error('Queue service not available');
    }
    const job = await queue.addImportJob({
      ownerId,
      source: 'csv',
      rawData: { csv },
    });
    return { jobId: job.id ?? '' };
  }

  public async enqueueJson(ownerId: string, items: RawListingInput[]): Promise<{ jobId: string }> {
    const queue = getQueueService();
    if (!queue) {
      throw new Error('Queue service not available');
    }
    const job = await queue.addImportJob({
      ownerId,
      source: 'json',
      rawData: { items },
    });
    return { jobId: job.id ?? '' };
  }

  public async enqueueUrl(ownerId: string, url: string): Promise<{ jobId: string }> {
    const queue = getQueueService();
    if (!queue) {
      throw new Error('Queue service not available');
    }
    const job = await queue.addImportJob({
      ownerId,
      source: 'url',
      rawData: { url },
    });
    return { jobId: job.id ?? '' };
  }

  public async processImportJob(payload: ImportJobPayload): Promise<{ created: number }> {
    const { ownerId, source, rawData } = payload;
    const items = await this.parseRawData(source, rawData);
    let created = 0;
    for (const raw of items) {
      try {
        const normalized = this.normalizeRawListing(raw);
        const similar = await this.repository.findSimilarListings({
          city: normalized.city,
          title: normalized.title,
          priceMin: normalized.price * 0.8,
          priceMax: normalized.price * 1.2,
        });
        if (similar.length >= 1) {
          continue;
        }
        const enhanced = await this.enhanceWithAI(normalized);
        const listing = await this.repository.createListing({
          ownerId,
          title: enhanced.title,
          description: enhanced.description,
          type: enhanced.type,
          pricePerNight: enhanced.price,
          currency: enhanced.currency,
          city: enhanced.city,
          country: enhanced.country,
          address: enhanced.address,
          district: enhanced.district,
          latitude: enhanced.latitude,
          longitude: enhanced.longitude,
          rooms: enhanced.rooms,
          maxGuests: enhanced.maxGuests,
        });
        const amenityIds: string[] = [];
        for (const name of enhanced.amenityNames ?? []) {
          const a = await this.repository.findAmenityByName(name);
          if (a) amenityIds.push(a.id);
        }
        if (amenityIds.length > 0) {
          await this.repository.assignAmenities(listing.id, amenityIds);
        }
        const queue = getQueueService();
        if (queue) {
          if (enhanced.imageUrls?.length) {
            for (let i = 0; i < enhanced.imageUrls.length; i++) {
              const url = enhanced.imageUrls[i];
              if (!url || !url.startsWith('http')) continue;
              const img = await this.repository.createListingImage({
                listingId: listing.id,
                url,
                order: i,
              });
              await queue.addImageProcessingJob({
                listingId: listing.id,
                imageId: img.id,
                imageUrl: url,
              });
            }
          }
          await queue.addSearchIndexJob({ action: 'indexListing', listingId: listing.id });
          await queue.addAIProcessingJob({ task: 'runModeration', listingId: listing.id });
          await queue.addAIProcessingJob({ task: 'generateEmbeddings', listingId: listing.id });
        }
        created++;
      } catch {
        // skip failed item
      }
    }
    return { created };
  }

  private async parseRawData(
    source: 'csv' | 'json' | 'url',
    rawData: unknown,
  ): Promise<RawListingInput[]> {
    if (source === 'csv') {
      return this.parseCsv((rawData as { csv?: string }).csv ?? '');
    }
    if (source === 'json') {
      const items = (rawData as { items?: RawListingInput[] }).items ?? [];
      return Array.isArray(items) ? items : [items];
    }
    if (source === 'url') {
      const url = (rawData as { url?: string }).url ?? '';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch URL');
      const data = (await response.json()) as RawListingInput | RawListingInput[];
      return Array.isArray(data) ? data : [data];
    }
    return [];
  }

  private parseCsv(csv: string): RawListingInput[] {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const result: RawListingInput[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const obj: RawListingInput = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] ?? '';
      });
      result.push(obj);
    }
    return result;
  }

  private normalizeRawListing(raw: RawListingInput): NormalizedListing {
    const getStr = (key: string, fallback: string) =>
      String(raw[key] ?? raw[key.toLowerCase()] ?? fallback).trim();
    const getNum = (key: string, fallback: number) => {
      const v = raw[key] ?? raw[key.toLowerCase()];
      if (v === null || v === undefined) return fallback;
      const n = Number(v);
      return Number.isNaN(n) ? fallback : n;
    };
    const title = getStr('title', getStr('name', 'Imported Listing'));
    const city = getStr('city', getStr('location', 'Unknown'));
    const country = getStr('country', 'Unknown');
    const typeStr = getStr('type', 'apartment').toLowerCase();
    const type = LISTING_TYPE_MAP[typeStr] ?? ListingType.APARTMENT;
    const price = getNum('price', getNum('pricePerNight', 100));
    const description = getStr('description', `${title} in ${city}.`);
    const address = getStr('address', `${city}, ${country}`);
    const imageUrls: string[] = [];
    const img = getStr('image', '') || getStr('imageUrl', '') || getStr('images', '');
    if (img) imageUrls.push(...img.split('|').map((u) => u.trim()).filter(Boolean));
    const amenityStr = getStr('amenities', '');
    const amenityNames = amenityStr
      ? amenityStr.split(/[,;|]/).map((a) => a.trim()).filter(Boolean)
      : [];
    return {
      title: title || 'Imported Listing',
      description: description || `${title} in ${city}.`,
      type,
      price: Math.max(1, price),
      currency: getStr('currency', 'USD'),
      city: city || 'Unknown',
      country: country || 'Unknown',
      address: address || `${city}, ${country}`,
      district: getStr('district', '') || null,
      latitude: getNum('lat', getNum('latitude', 0)) || null,
      longitude: getNum('lng', getNum('longitude', 0)) || null,
      rooms: getNum('rooms', 1) || null,
      maxGuests: getNum('guests', getNum('maxGuests', 2)) || null,
      imageUrls: imageUrls.length ? imageUrls : undefined,
      amenityNames: amenityNames.length ? amenityNames : undefined,
    };
  }

  private async enhanceWithAI(normalized: NormalizedListing): Promise<NormalizedListing> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return normalized;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.4,
          max_tokens: 400,
          messages: [
            {
              role: 'system',
              content: `You are a real estate expert. Given raw listing data, return JSON:
{ "description": "2-3 paragraph description", "amenities": ["WiFi","Kitchen",...] }
Use only these amenity names: WiFi, Parking, Air conditioning, Kitchen, Pool, TV, Washing machine, Balcony, Heating, Bed.
Return ONLY valid JSON, no markdown.`,
            },
            {
              role: 'user',
              content: JSON.stringify({
                title: normalized.title,
                city: normalized.city,
                type: normalized.type,
                rawDescription: normalized.description?.slice(0, 200),
                rawAmenities: normalized.amenityNames,
              }),
            },
          ],
        }),
      });
      if (!response.ok) return normalized;
      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) return normalized;
      let parsed: { description?: string; amenities?: string[] };
      try {
        parsed = JSON.parse(content.replace(/^```json?\s*|\s*```$/g, '')) as {
          description?: string;
          amenities?: string[];
        };
      } catch {
        return normalized;
      }
      const amenityNames = (parsed.amenities ?? [])
        .filter((a) => KNOWN_AMENITIES.has(String(a)))
        .slice(0, 10);
      return {
        ...normalized,
        description: parsed.description ?? normalized.description,
        amenityNames: amenityNames.length ? amenityNames : normalized.amenityNames,
      };
    } catch {
      return normalized;
    }
  }
}
