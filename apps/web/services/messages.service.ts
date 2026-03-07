import { apiRequest } from '../lib/api';
import type { Conversation, Message } from '../types';

export async function getConversations() {
  return apiRequest<Conversation[]>('/conversations', { cacheTtlMs: 10_000 });
}

export async function getConversationMessages(conversationId: string, page = 1, limit = 20) {
  return apiRequest<{ items: Message[]; total: number; page: number; pages: number }>(
    `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
  );
}

export async function sendMessage(conversationId: string, text: string) {
  return apiRequest('/messages', {
    method: 'POST',
    body: { conversationId, text },
  });
}
