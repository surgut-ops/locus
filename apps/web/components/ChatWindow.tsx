'use client';

import { useMemo, useState } from 'react';

import { Button, Input } from '@locus/ui';

import type { Message } from '../types';

type ChatWindowProps = {
  messages: Message[];
  myUserId: string | null;
  onSend: (text: string) => Promise<void>;
  loading?: boolean;
};

export function ChatWindow({ messages, myUserId, onSend, loading = false }: ChatWindowProps) {
  const [text, setText] = useState('');
  const sorted = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  );

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {sorted.map((msg) => (
          <div key={msg.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.senderId === myUserId ? 'ml-auto bg-pink-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
            <p>{msg.text}</p>
            <p className={`mt-1 text-[10px] ${msg.senderId === myUserId ? 'text-pink-100' : 'text-slate-500'}`}>
              {new Date(msg.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <form
        className="border-t border-slate-200 p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          await onSend(text.trim());
          setText('');
        }}
      >
        <div className="flex gap-2">
          <Input value={text} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)} placeholder="Type your message..." />
          <Button type="submit" disabled={loading}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
