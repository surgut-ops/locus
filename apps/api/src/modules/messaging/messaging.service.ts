import Redis from 'ioredis';

import { getQueueService } from '../infrastructure/queue/queue.service.js';
import type { AuthenticatedUser } from '../../utils/auth.js';
import { MessagingGateway } from './messaging.gateway.js';
import { MessagingRepository } from './messaging.repository.js';
import { MessagingError, type CreateConversationDto, type PaginationQuery, type SendMessageDto } from './messaging.types.js';

type ReadStateStore = {
  setReadAt(conversationId: string, userId: string, readAt: Date): Promise<void>;
  getReadAt(conversationId: string, userId: string): Promise<Date | null>;
};

class RedisReadStateStore implements ReadStateStore {
  private readonly redis: Redis | null;
  private readonly fallback = new Map<string, string>();

  public constructor(redisUrl: string | null) {
    this.redis = redisUrl ? new Redis(redisUrl) : null;
  }

  public async setReadAt(conversationId: string, userId: string, readAt: Date): Promise<void> {
    const key = this.key(conversationId, userId);
    const value = readAt.toISOString();
    if (this.redis) {
      await this.redis.set(key, value, 'EX', 60 * 60 * 24 * 30);
      return;
    }
    this.fallback.set(key, value);
  }

  public async getReadAt(conversationId: string, userId: string): Promise<Date | null> {
    const key = this.key(conversationId, userId);
    const value = this.redis ? await this.redis.get(key) : this.fallback.get(key);
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private key(conversationId: string, userId: string): string {
    return `messaging:read:${conversationId}:${userId}`;
  }
}

export class MessagingService {
  private readonly readState: ReadStateStore;

  public constructor(
    private readonly repository: MessagingRepository,
    private readonly gateway: MessagingGateway,
    private readonly notificationsService?: import('../notifications/notifications.service.js').NotificationsService,
  ) {
    const redisUrl = process.env.REDIS_URL ?? null;
    this.readState = new RedisReadStateStore(redisUrl);
  }

  public async createConversation(actor: AuthenticatedUser, payload: unknown) {
    const dto = parseCreateConversation(payload);

    if (dto.guestId === dto.hostId) {
      throw new MessagingError('Guest cannot message themselves', 400);
    }
    if (actor.id !== dto.guestId && actor.id !== dto.hostId) {
      throw new MessagingError('Only conversation participants can create conversation', 403);
    }

    const listing = await this.repository.getListingById(dto.listingId);
    if (!listing) {
      throw new MessagingError('Listing not found', 404);
    }
    if (listing.ownerId !== dto.hostId) {
      throw new MessagingError('Host does not match listing owner', 400);
    }

    const existing = await this.repository.findConversationByUniqueParams(
      dto.listingId,
      dto.hostId,
      dto.guestId,
    );
    if (existing) {
      return existing;
    }

    return this.repository.createConversation(dto.listingId, dto.hostId, dto.guestId);
  }

  public async getUserConversations(actor: AuthenticatedUser) {
    const conversations = await this.repository.getUserConversations(actor.id);
    return conversations.map((conversation) => ({
      conversationId: conversation.id,
      listing: conversation.listing,
      host: conversation.host,
      guest: conversation.guest,
      lastMessage: conversation.messages[0] ?? null,
      updatedAt: conversation.updatedAt,
    }));
  }

  public async sendMessage(actor: AuthenticatedUser, payload: unknown) {
    const dto = parseSendMessage(payload);
    const conversation = await this.repository.getConversationById(dto.conversationId);
    if (!conversation) {
      throw new MessagingError('Conversation not found', 404);
    }
    assertParticipant(actor.id, conversation.guestId, conversation.hostId);

    const message = await this.repository.createMessage(dto.conversationId, actor.id, dto.text);
    const senderProfile = await this.repository.getUserProfile(actor.id);
    if (!senderProfile) {
      throw new MessagingError('Sender not found', 404);
    }

    const recipientId = conversation.guestId === actor.id ? conversation.hostId : conversation.guestId;

    if (this.notificationsService) {
      const senderName = `${senderProfile.firstName} ${senderProfile.lastName}`.trim() || 'Пользователь';
      this.notificationsService.notifyNewMessage(recipientId, senderName).catch(() => {});
    }

    const senderName = `${senderProfile.firstName} ${senderProfile.lastName}`.trim() || 'Пользователь';
    const queueService = getQueueService();
    if (queueService) {
      await queueService.addNotificationJob({
        type: 'message',
        userId: recipientId,
        title: 'Новое сообщение',
        body: `${senderName} отправил вам сообщение`,
      });
      const recipientEmail = await this.repository.getUserEmail(recipientId);
      const recipientProfile = await this.repository.getUserProfile(recipientId);
      const recipientName = recipientProfile
        ? `${recipientProfile.firstName} ${recipientProfile.lastName}`.trim() || 'Пользователь'
        : 'Пользователь';
      if (recipientEmail) {
        const preview = dto.text.length > 100 ? dto.text.slice(0, 100) + '...' : dto.text;
        await queueService.addEmailJob({
          template: 'new_message',
          to: recipientEmail,
          subject: 'Новое сообщение — LOCUS',
          data: {
            recipientName,
            senderName,
            preview,
          },
        });
      }
    }

    await this.gateway.emitMessageToConversationParticipants(
      [recipientId],
      {
        conversationId: dto.conversationId,
        message,
        sender: senderProfile,
      },
    );

    return message;
  }

  public async getMessages(actor: AuthenticatedUser, conversationId: string, query: PaginationQuery) {
    assertNonEmptyString(conversationId, 'conversationId is required');
    const conversation = await this.repository.getConversationById(conversationId);
    if (!conversation) {
      throw new MessagingError('Conversation not found', 404);
    }
    assertParticipant(actor.id, conversation.guestId, conversation.hostId);

    const page = parsePositiveInt(query.page, 1);
    const limit = Math.min(parsePositiveInt(query.limit, 20), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.repository.getMessages(conversationId, skip, limit),
      this.repository.countMessages(conversationId),
    ]);

    // Read status is stored in Redis/fallback store due immutable DB schema.
    const readAt = await this.readState.getReadAt(conversationId, actor.id);
    const mapped = items.map((item) => ({
      ...item,
      isRead: readAt ? item.createdAt <= readAt : item.senderId === actor.id,
    }));

    await this.readState.setReadAt(conversationId, actor.id, new Date());

    return {
      items: mapped,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}

function parseCreateConversation(payload: unknown): CreateConversationDto {
  if (!isObject(payload)) {
    throw new MessagingError('Invalid conversation payload', 400);
  }
  return {
    listingId: requireString(payload.listingId, 'listingId'),
    hostId: requireString(payload.hostId, 'hostId'),
    guestId: requireString(payload.guestId, 'guestId'),
  };
}

function parseSendMessage(payload: unknown): SendMessageDto {
  if (!isObject(payload)) {
    throw new MessagingError('Invalid message payload', 400);
  }
  return {
    conversationId: requireString(payload.conversationId, 'conversationId'),
    text: requireString(payload.text, 'text'),
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new MessagingError(`Field "${field}" is required`, 400);
  }
  return value.trim();
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new MessagingError('Pagination params must be positive integers', 400);
  }
  return parsed;
}

function assertParticipant(userId: string, guestId: string, hostId: string): void {
  if (userId !== guestId && userId !== hostId) {
    throw new MessagingError('Only participants can access this conversation', 403);
  }
}

function assertNonEmptyString(value: string, message: string): void {
  if (!value || !value.trim()) {
    throw new MessagingError(message, 400);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
