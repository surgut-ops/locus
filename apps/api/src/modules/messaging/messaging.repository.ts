import type { PrismaClient } from '@prisma/client';

export class MessagingRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getListingById(listingId: string) {
    return this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        city: true,
        country: true,
      },
    });
  }

  public async findConversationByUniqueParams(listingId: string, hostId: string, guestId: string) {
    return this.prisma.conversation.findFirst({
      where: { listingId, hostId, guestId },
      include: {
        listing: {
          select: { id: true, title: true, city: true, country: true },
        },
        host: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        guest: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
  }

  public async createConversation(listingId: string, hostId: string, guestId: string) {
    return this.prisma.conversation.create({
      data: { listingId, hostId, guestId },
      include: {
        listing: {
          select: { id: true, title: true, city: true, country: true },
        },
        host: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        guest: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
  }

  public async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        OR: [{ guestId: userId }, { hostId: userId }],
      },
      include: {
        listing: {
          select: { id: true, title: true, city: true, country: true },
        },
        host: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        guest: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, senderId: true, text: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  public async getConversationById(conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        listing: {
          select: { id: true, title: true, city: true, country: true },
        },
        host: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        guest: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
  }

  public async createMessage(conversationId: string, senderId: string, text: string) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { conversationId, senderId, text },
        select: { id: true, conversationId: true, senderId: true, text: true, createdAt: true },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: now },
      });
      return message;
    });
  }

  public async getMessages(conversationId: string, skip: number, take: number) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: { id: true, senderId: true, text: true, createdAt: true },
    });
  }

  public async countMessages(conversationId: string) {
    return this.prisma.message.count({
      where: { conversationId },
    });
  }

  public async getUserProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  public async getUserEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  }
}
