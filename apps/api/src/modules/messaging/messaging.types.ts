export type CreateConversationDto = {
  listingId: string;
  hostId: string;
  guestId: string;
};

export type SendMessageDto = {
  conversationId: string;
  text: string;
};

export type PaginationQuery = {
  page?: string;
  limit?: string;
};

export type PaginatedMessages = {
  items: Array<{
    id: string;
    senderId: string;
    text: string;
    createdAt: Date;
    isRead: boolean;
  }>;
  total: number;
  page: number;
  pages: number;
};

export type MessageRealtimePayload = {
  conversationId: string;
  message: {
    id: string;
    senderId: string;
    text: string;
    createdAt: Date;
  };
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export class MessagingError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'MessagingError';
    this.statusCode = statusCode;
  }
}
