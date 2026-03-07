import type { ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title ?? 'Modal'}</h2>
          <button onClick={onClose} className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100">
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
