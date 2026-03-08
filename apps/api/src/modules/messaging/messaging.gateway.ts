import { randomUUID } from 'node:crypto';

import websocket from '@fastify/websocket';

interface SocketLike {
  on(event: string, handler: (...args: unknown[]) => void): void;
  close(code?: number, reason?: string): void;
  send(data: string): void;
  readyState: number;
}
type SocketConnection = { socket: SocketLike };
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Redis from 'ioredis';

import { getSharedRedis } from '../../lib/redis.client.js';
import { requireAuthenticatedUser } from '../../utils/auth.js';
import type { MessageRealtimePayload } from './messaging.types.js';

type NotificationPayload = {
  type: 'message:new';
  conversationId: string;
  recipientId: string;
};

type OutboundEvent =
  | { event: 'message:new'; payload: MessageRealtimePayload }
  | { event: 'notification:new'; payload: NotificationPayload };

type PresenceStore = {
  addSession(userId: string, socketId: string): Promise<void>;
  removeSession(userId: string, socketId: string): Promise<void>;
  isOnline(userId: string): Promise<boolean>;
};

class RedisPresenceStore implements PresenceStore {
  private readonly redis: Redis | null;
  private readonly fallbackSessions = new Map<string, Set<string>>();

  public constructor() {
    this.redis = getSharedRedis();
  }

  public async addSession(userId: string, socketId: string): Promise<void> {
    if (this.redis) {
      await this.redis.sadd(this.sessionsKey(userId), socketId);
      await this.redis.expire(this.sessionsKey(userId), 60 * 60);
      return;
    }
    const sessions = this.fallbackSessions.get(userId) ?? new Set<string>();
    sessions.add(socketId);
    this.fallbackSessions.set(userId, sessions);
  }

  public async removeSession(userId: string, socketId: string): Promise<void> {
    if (this.redis) {
      await this.redis.srem(this.sessionsKey(userId), socketId);
      return;
    }
    const sessions = this.fallbackSessions.get(userId);
    if (!sessions) {
      return;
    }
    sessions.delete(socketId);
    if (sessions.size === 0) {
      this.fallbackSessions.delete(userId);
    }
  }

  public async isOnline(userId: string): Promise<boolean> {
    if (this.redis) {
      const count = await this.redis.scard(this.sessionsKey(userId));
      return count > 0;
    }
    return (this.fallbackSessions.get(userId)?.size ?? 0) > 0;
  }

  private sessionsKey(userId: string): string {
    return `messaging:online:${userId}`;
  }
}

export class MessagingGateway {
  private readonly sockets = new Map<string, Map<string, SocketLike>>();
  private readonly presence: PresenceStore;
  private websocketRegistered = false;

  public constructor() {
    this.presence = new RedisPresenceStore();
  }

  public async registerWebsocket(fastify: FastifyInstance): Promise<void> {
    if (!this.websocketRegistered) {
      await fastify.register(websocket);
      this.websocketRegistered = true;
    }

    fastify.get('/ws/messages', { websocket: true }, (socket: SocketLike, request) => {
      void this.handleConnection({ socket }, request);
    });
  }

  public async emitMessageToConversationParticipants(
    recipientIds: string[],
    payload: MessageRealtimePayload,
  ): Promise<void> {
    for (const recipientId of recipientIds) {
      if (await this.presence.isOnline(recipientId)) {
        this.emitToUser(recipientId, {
          event: 'message:new',
          payload,
        });
      }

      this.emitToUser(recipientId, {
        event: 'notification:new',
        payload: {
          type: 'message:new',
          conversationId: payload.conversationId,
          recipientId,
        },
      });
    }
  }

  private async handleConnection(connection: SocketConnection, request: FastifyRequest): Promise<void> {
    let userId = '';
    let socketId = '';

    try {
      const user = requireAuthenticatedUser(request);
      userId = user.id;
      socketId = randomUUID();

      const userSockets = this.sockets.get(userId) ?? new Map<string, SocketLike>();
      userSockets.set(socketId, connection.socket);
      this.sockets.set(userId, userSockets);
      await this.presence.addSession(userId, socketId);

      connection.socket.on('close', () => {
        void this.disconnect(userId, socketId);
      });

      connection.socket.on('error', () => {
        void this.disconnect(userId, socketId);
      });
    } catch {
      connection.socket.close(1008, 'Authentication required');
    }
  }

  private emitToUser(userId: string, event: OutboundEvent): void {
    const sockets = this.sockets.get(userId);
    if (!sockets || sockets.size === 0) {
      return;
    }

    const payload = JSON.stringify(event);
    for (const socket of sockets.values()) {
      if (socket.readyState === 1) {
        socket.send(payload);
      }
    }
  }

  private async disconnect(userId: string, socketId: string): Promise<void> {
    const userSockets = this.sockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.sockets.delete(userId);
      }
    }
    await this.presence.removeSession(userId, socketId);
  }
}
