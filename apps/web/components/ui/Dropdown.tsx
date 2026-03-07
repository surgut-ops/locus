'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { PropsWithChildren, ReactNode } from 'react';
import { useState } from 'react';

type DropdownProps = PropsWithChildren<{
  trigger: ReactNode;
}>;

export function Dropdown({ trigger, children }: DropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex"
        aria-expanded={open}
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              <div className="space-y-1">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
