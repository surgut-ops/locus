import type { Conversation } from '../types';

type ConversationListProps = {
  items: Conversation[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
};

export function ConversationList({ items, activeConversationId, onSelect }: ConversationListProps) {
  return (
    <div className="h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white">
      {items.map((item) => (
        <button
          key={item.conversationId}
          onClick={() => onSelect(item.conversationId)}
          className={`w-full border-b border-slate-100 p-3 text-left hover:bg-slate-50 ${activeConversationId === item.conversationId ? 'bg-pink-50' : ''}`}
        >
          <p className="text-sm font-semibold text-slate-900">{item.listing.title}</p>
          <p className="text-xs text-slate-600">{item.lastMessage?.text ?? 'No messages yet'}</p>
        </button>
      ))}
    </div>
  );
}
