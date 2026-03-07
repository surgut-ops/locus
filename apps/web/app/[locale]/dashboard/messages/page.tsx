'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { ConversationCard } from '../../../../components/ConversationCard';
import { getConversations } from '../../../../services/messages.service';
import type { Conversation } from '../../../../types';

export default function DashboardMessagesPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const myUserId = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('locus_user_id') ?? '' : ''),
    [],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getConversations();
        setItems(data ?? []);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-slate-600">No conversations yet.</p>
      ) : (
        items.map((conversation) => {
          const peer =
            conversation.host.id === myUserId
              ? `${conversation.guest.firstName} ${conversation.guest.lastName}`
              : `${conversation.host.firstName} ${conversation.host.lastName}`;
          return (
            <ConversationCard
              key={conversation.conversationId}
              conversationId={conversation.conversationId}
              listingTitle={conversation.listing.title}
              peerName={peer}
              lastMessage={conversation.lastMessage?.text ?? ''}
              updatedAt={conversation.updatedAt}
            />
          );
        })
      )}
    </motion.div>
  );
}
