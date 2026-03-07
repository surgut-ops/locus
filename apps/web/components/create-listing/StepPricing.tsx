'use client';

import { useState } from 'react';

import { fetchPricingSuggestion } from '../../services/listings.service';

type PricingState = {
  price: number | null;
  currency: string;
};

type StepPricingProps = {
  value: PricingState;
  onChange: (next: PricingState) => void;
  listingId: string | null;
};

export function StepPricing({ value, onChange, listingId }: StepPricingProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    currentPrice: number | null;
    averageMarketPrice: number;
    recommendedPrice: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecommendPrice = async () => {
    if (!listingId) {
      setError('Сохраните объявление, чтобы получить рекомендацию цены');
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const result = await fetchPricingSuggestion(listingId);
      setSuggestion(result);
      onChange({
        ...value,
        price: result.recommendedPrice,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось получить рекомендацию');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Цена за ночь
          </label>
          <input
            type="number"
            min={1}
            value={value.price ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onChange({
                ...value,
                price: event.target.value ? Number(event.target.value) : null,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Валюта
          </label>
          <select
            value={value.currency}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              onChange({ ...value, currency: event.target.value })
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="RUB">RUB</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <button
          type="button"
          onClick={handleRecommendPrice}
          disabled={loading || !listingId}
          className="min-h-[44px] rounded-xl bg-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Анализ...' : 'Рекомендовать цену'}
        </button>

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        {suggestion && !error && (
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>
              <span className="font-medium">Средняя рыночная цена:</span>{' '}
              {value.currency === 'USD' && '$'}
              {value.currency === 'EUR' && '€'}
              {suggestion.averageMarketPrice.toFixed(2)}
              {value.currency === 'RUB' && ' ₽'}
            </p>
            <p>
              <span className="font-medium">Рекомендуемая цена:</span>{' '}
              <span className="font-semibold text-pink-600">
                {value.currency === 'USD' && '$'}
                {value.currency === 'EUR' && '€'}
                {suggestion.recommendedPrice.toFixed(2)}
                {value.currency === 'RUB' && ' ₽'}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
