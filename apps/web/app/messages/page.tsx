'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { ChatWindow } from '../../components/ChatWindow';
import { ConversationList } from '../../components/ConversationList';
import { useHydrateAuth } from '../../hooks/useHydrateAuth';
import { getConversationMessages, getConversations, sendMessage } from '../../services/messages.service';
import { useAppStore } from '../../store/app.store';
import type { Conversation, Message } from '../../types';

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001/ws/messages';

export default function MessagesPage() {
  useHydrateAuth();
  const auth = useAppStore((state) => state.auth);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await getConversations();
        setConversations(list);
        if (list[0]) {
          setActiveConversationId(list[0].conversationId);
        }
      } catch {
        setConversations([]);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!activeConversationId) return;
    const loadMessages = async () => {
      const data = await getConversationMessages(activeConversationId, 1, 50);
      setMessages(data.items);
    };
    void loadMessages();
  }, [activeConversationId]);

  useEffect(() => {
    if (!auth.userId || !auth.role) return;
    const wsUrl = `${WS_BASE}?userId=${encodeURIComponent(auth.userId)}&userRole=${encodeURIComponent(auth.role)}`;
    const ws = new WebSocket(wsUrl, []);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          event: string;
          payload?: {
            conversationId?: string;
            message?: Message;
          };
        };

        if (payload.event === 'message:new' && payload.payload?.conversationId === activeConversationId && payload.payload?.message) {
          setMessages((prev) => [...prev, payload.payload!.message!]);
        }
      } catch {
        // ignore malformed payload
      }
    };

    return () => ws.close();
  }, [activeConversationId, auth.userId, auth.role]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.conversationId === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <ConversationList
        items={conversations}
        activeConversationId={activeConversationId}
        onSelect={setActiveConversationId}
      />
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-slate-900">
          {activeConversation ? activeConversation.listing.title : 'Messages'}
        </h1>
        <ChatWindow
          messages={messages}
          myUserId={auth.userId}
          loading={loading}
          onSend={async (text) => {
            if (!activeConversationId) return;
            setLoading(true);
            await sendMessage(activeConversationId, text);
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                senderId: auth.userId ?? 'me',
                text,
                createdAt: new Date().toISOString(),
              },
            ]);
            setLoading(false);
          }}
        />
      </div>
    </div>
  );
}
