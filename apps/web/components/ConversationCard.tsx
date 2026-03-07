'use client';

import { Link } from '../i18n/navigation';
import { motion } from 'framer-motion';

type ConversationCardProps = {
  conversationId: string;
  listingTitle: string;
  peerName: string;
  lastMessage: string;
  updatedAt: string;
};

export function ConversationCard({
  conversationId,
  listingTitle,
  peerName,
  lastMessage,
  updatedAt,
}: ConversationCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{listingTitle}</h3>
          <p className="text-sm text-slate-600">{peerName}</p>
        </div>
        <span className="shrink-0 text-xs text-slate-500">{new Date(updatedAt).toLocaleDateString()}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-700">{lastMessage || 'No messages yet'}</p>
      <Link href={`/messages?conversationId=${conversationId}`} className="mt-3 inline-block text-sm font-medium text-slate-900 underline">
        Open chat
      </Link>
    </motion.article>
  );
}
