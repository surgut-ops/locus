'use client';

import { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const STORAGE_KEY = 'locus_install_prompt_dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };

    window.addEventListener('beforeinstallprompt', handler);
    checkStandalone();

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    sessionStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  if (!showPrompt || isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:bottom-6 md:left-auto">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-100">
          <span className="text-2xl">🏠</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">Install LOCUS</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            Add to your home screen for a faster, app-like experience.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="min-h-[44px] flex-1 rounded-xl bg-pink-600 px-4 font-medium text-white transition active:bg-pink-700"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-[44px] rounded-xl px-4 text-sm text-slate-600 transition active:bg-slate-100"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-xl p-2 text-slate-400 transition active:bg-slate-100"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
