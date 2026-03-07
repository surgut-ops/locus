import type { ModerationStatus } from '@prisma/client';

export type ModerationResult = {
  textApproved: boolean;
  textRejectionReason?: string;
  photoScore: number;
  duplicateScore: number;
  fraudScore: number;
  moderationStatus: ModerationStatus;
};

export type PendingListing = {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  moderationStatus: ModerationStatus;
  fraudScore: number | null;
  createdAt: Date;
};

export class ModerationError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ModerationError';
    this.statusCode = statusCode;
  }
}
