import { ListingType } from '@prisma/client';

import { LoggerService } from '../infrastructure/logging/logger.service.js';
import type { AiListingAnalyzeResponse } from './ai-listing.types.js';
import { AiListingError } from './ai-listing.types.js';

const LISTING_TYPE_MAP: Record<string, ListingType> = {
  APARTMENT: 'APARTMENT',
  HOUSE: 'HOUSE',
  STUDIO: 'STUDIO',
  ROOM: 'ROOM',
  VILLA: 'VILLA',
  HOTEL: 'HOTEL',
  apartment: 'APARTMENT',
  house: 'HOUSE',
  studio: 'STUDIO',
  room: 'ROOM',
  villa: 'VILLA',
  hotel: 'HOTEL',
};

const VALID_AMENITY_NAMES = new Set([
  'WiFi',
  'Parking',
  'Air conditioning',
  'Kitchen',
  'Pool',
  'TV',
  'Washing machine',
  'Balcony',
  'Heating',
  'Bed',
]);

export class AiListingService {
  private readonly logger = new LoggerService('ai-listing');

  public async analyzeImage(imageBuffer: Buffer, mimeType: string): Promise<AiListingAnalyzeResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AiListingError('OpenAI API key is not configured', 503);
    }

    const base64 = imageBuffer.toString('base64');
    const mediaType = mimeType || 'image/jpeg';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a real estate listing expert. Analyze the property photo and return a JSON object with:
- detected: { roomType, bed, sofa, kitchen, bathroom, balcony } (boolean for each feature except roomType)
- roomType: one of APARTMENT, HOUSE, STUDIO, ROOM, VILLA, HOTEL
- title: short catchy title in Russian (e.g. "Современная квартира с балконом и кухней")
- description: full property description in Russian, 2-4 paragraphs
- amenities: array of strings from this exact list: WiFi, Kitchen, Bed, TV, Balcony, Parking, Air conditioning, Pool, Washing machine, Heating
- suggestedPrice: number, suggested price per night in RUB (reasonable for the property type)
Return only valid JSON, no markdown.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error('OpenAI Vision API error', {
        status: response.status,
        body: errText.slice(0, 200),
      });
      throw new AiListingError('AI analysis failed', 502);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new AiListingError('Empty AI response', 502);
    }

    const parsed = this.parseAiResponse(content);
    return parsed;
  }

  private parseAiResponse(content: string): AiListingAnalyzeResponse {
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      this.logger.warn('Failed to parse AI response as JSON', { content: content.slice(0, 200) });
      throw new AiListingError('Invalid AI response format', 502);
    }

    const title = typeof data.title === 'string' ? data.title.trim() : 'Квартира для аренды';
    const description =
      typeof data.description === 'string' ? data.description.trim() : 'Уютное жильё для аренды.';
    const roomType = this.parseRoomType(data.roomType);
    const amenities = this.parseAmenities(data.amenities);
    const suggestedPrice = this.parseSuggestedPrice(data.suggestedPrice);

    return {
      title,
      description,
      amenities,
      roomType,
      suggestedPrice,
    };
  }

  private parseRoomType(value: unknown): ListingType {
    if (typeof value === 'string' && value in LISTING_TYPE_MAP) {
      return LISTING_TYPE_MAP[value];
    }
    return 'APARTMENT';
  }

  private parseAmenities(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((a): a is string => typeof a === 'string')
      .map((a) => a.trim())
      .filter((a) => VALID_AMENITY_NAMES.has(a) || a.length > 0);
  }

  private parseSuggestedPrice(value: unknown): number {
    if (typeof value === 'number' && value > 0) {
      return Math.round(value);
    }
    if (typeof value === 'string') {
      const num = parseInt(value.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 5000;
  }
}
