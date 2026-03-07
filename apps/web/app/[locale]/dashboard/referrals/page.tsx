'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '../../../../components/ui';
import { fetchReferralMe, type ReferralMe } from '../../../../services/referral.service';

export default function DashboardReferralsPage() {
  const [data, setData] = useState<ReferralMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchReferralMe();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCopyLink() {
    if (!data?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(data.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError('Не удалось скопировать');
    }
  }

  async function handleShare() {
    if (!data?.inviteLink) return;
    setShareError(null);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Приглашение в LOCUS',
          text: 'Присоединяйся к LOCUS — платформе аренды жилья',
          url: data.inviteLink,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setShareError('Не удалось поделиться');
        }
      }
    } else {
      await handleCopyLink();
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
        Не удалось загрузить данные реферальной программы
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Реферальная программа</h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Приглашайте друзей по ссылке. После их первой брони вы получите 500 кредитов.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
            {data.inviteLink}
          </div>
          <Button
            type="button"
            onClick={handleShare}
            className="shrink-0"
          >
            Share Invite Link
          </Button>
        </div>
        {copied && (
          <p className="mt-2 text-sm text-emerald-600">Ссылка скопирована в буфер обмена</p>
        )}
        {shareError && (
          <p className="mt-2 text-sm text-red-600">{shareError}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Всего приглашено</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{data.totalReferrals}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Ваши кредиты</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{data.totalCredits}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-700">Приглашённые пользователи</h3>
        {data.referrals.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
            Пока нет приглашённых
          </p>
        ) : (
          <ul className="space-y-2">
            {data.referrals.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{r.referredUserName}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                {r.rewardPaid ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                    Бонус начислен
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                    Ожидает брони
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
