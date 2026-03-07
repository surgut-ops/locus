import { ModerationStatus } from '@prisma/client';

import type { NotificationsService } from '../notifications/notifications.service.js';
import { ModerationRepository } from './moderation.repository.js';
import type { ModerationResult, PendingListing } from './moderation.types.js';
import { ModerationError } from './moderation.types.js';

const FRAUD_THRESHOLD_MANUAL = 70;
const MIN_IMAGE_WIDTH = 400;
const MIN_IMAGE_HEIGHT = 300;

export class ModerationService {
  public constructor(
    private readonly repository: ModerationRepository,
    private readonly notificationsService?: NotificationsService,
  ) {}

  public async runModeration(listingId: string): Promise<ModerationResult> {
    const listing = await this.repository.getListingForModeration(listingId);
    if (!listing) {
      throw new ModerationError('Listing not found', 404);
    }

    const textResult = await this.checkText(listing.title, listing.description);
    const photoScore = this.checkPhotos(listing.images);
    const duplicateScore = await this.checkDuplicates(listing);

    let fraudScore = 0;
    if (!textResult.approved) fraudScore += 40;
    fraudScore += Math.round((100 - photoScore) * 0.3);
    fraudScore += Math.min(Math.round(duplicateScore * 30), 30);
    fraudScore = Math.round(Math.min(100, Math.max(0, fraudScore)));

    let moderationStatus: ModerationStatus;
    if (!textResult.approved) {
      moderationStatus = ModerationStatus.REJECTED;
    } else if (fraudScore >= FRAUD_THRESHOLD_MANUAL) {
      moderationStatus = ModerationStatus.PENDING_REVIEW;
    } else {
      moderationStatus = ModerationStatus.APPROVED;
    }

    await this.repository.updateModerationResult(listingId, {
      moderationStatus,
      fraudScore,
    });

    return {
      textApproved: textResult.approved,
      textRejectionReason: textResult.reason,
      photoScore,
      duplicateScore,
      fraudScore,
      moderationStatus,
    };
  }

  public async getPendingListings(): Promise<PendingListing[]> {
    const rows = await this.repository.getPendingListings();
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      ownerId: r.ownerId,
      moderationStatus: r.moderationStatus,
      fraudScore: r.fraudScore,
      createdAt: r.createdAt,
    }));
  }

  public async approve(listingId: string): Promise<void> {
    const listing = await this.repository.getListingForModeration(listingId);
    if (!listing) {
      throw new ModerationError('Listing not found', 404);
    }
    await this.repository.setModerationStatus(listingId, ModerationStatus.APPROVED);
    if (this.notificationsService) {
      this.notificationsService.notifyListingApproved(listing.ownerId, listing.title).catch(() => {});
    }
  }

  public async reject(listingId: string): Promise<void> {
    const listing = await this.repository.getListingForModeration(listingId);
    if (!listing) {
      throw new ModerationError('Listing not found', 404);
    }
    await this.repository.setModerationStatus(listingId, ModerationStatus.REJECTED);
  }

  private async checkText(
    title: string,
    description: string,
  ): Promise<{ approved: boolean; reason?: string }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { approved: true };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are a content moderator for a rental listings platform.
Analyze title and description for: prohibited content, spam, misleading info, inappropriate language.
Return JSON: { "approved": boolean, "reason": string | null }
approved: true if content is acceptable, false if should be rejected.
reason: short explanation only when approved is false.`,
            },
            {
              role: 'user',
              content: JSON.stringify({ title, description: description?.slice(0, 1000) }),
            },
          ],
        }),
      });

      if (!response.ok) {
        return { approved: true };
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        return { approved: true };
      }

      const parsed = JSON.parse(content) as { approved?: boolean; reason?: string };
      const approved = parsed.approved !== false;
      return {
        approved,
        reason: approved ? undefined : (parsed.reason ?? 'Content rejected'),
      };
    } catch {
      return { approved: true };
    }
  }

  private checkPhotos(
    images: Array<{ width: number | null; height: number | null; url: string }>,
  ): number {
    if (images.length === 0) {
      return 50;
    }

    let totalScore = 0;
    for (const img of images) {
      let score = 100;
      const w = img.width ?? 0;
      const h = img.height ?? 0;
      if (w < MIN_IMAGE_WIDTH || h < MIN_IMAGE_HEIGHT) {
        score -= 30;
      }
      const ext = img.url.split('.').pop()?.toLowerCase() ?? '';
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        score -= 20;
      }
      totalScore += Math.max(0, score);
    }
    return Math.round(totalScore / images.length);
  }

  private async checkDuplicates(listing: {
    id: string;
    title: string;
    city: string;
    type: string;
    ownerId: string;
  }): Promise<number> {
    const similar = await this.repository.getSimilarListings({
      title: listing.title,
      city: listing.city,
      type: listing.type,
      ownerId: listing.ownerId,
      excludeId: listing.id,
    });
    if (similar.length === 0) return 0;
    if (similar.length >= 5) return 1;
    return similar.length / 5;
  }
}
