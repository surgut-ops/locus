'use client';

import { useMemo, useState } from 'react';

import { Button, Card, Input } from '@locus/ui';

import { fetchHostInsights } from '../services/ai-advanced.service';

type PriceSuggestionEditorProps = {
  listingId: string;
};

export function PriceSuggestionEditor({ listingId }: PriceSuggestionEditorProps) {
  const [currentPrice, setCurrentPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendedPrice, setRecommendedPrice] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const diff = useMemo(() => {
    if (!recommendedPrice || !currentPrice) {
      return null;
    }
    const current = Number(currentPrice);
    if (!Number.isFinite(current) || current <= 0) {
      return null;
    }
    return Math.round((recommendedPrice - current) * 100) / 100;
  }, [recommendedPrice, currentPrice]);

  const onAnalyze = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const insights = await fetchHostInsights(listingId);
      setRecommendedPrice(insights.optimalPrice.recommendedPrice);
      setMessage(`AI recommends price: $${insights.optimalPrice.recommendedPrice} per night`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load AI recommendation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <h3 className="text-base font-semibold text-slate-900">Listing editor (AI pricing)</h3>
      <Input
        type="number"
        min={1}
        placeholder="Current price per night"
        value={currentPrice}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPrice(e.target.value)}
      />
      <Button onClick={onAnalyze} disabled={loading}>
        {loading ? 'Analyzing...' : 'Get AI price suggestion'}
      </Button>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      {diff !== null ? (
        <p className="text-xs text-slate-600">
          Suggested delta: {diff > 0 ? '+' : ''}
          {diff}
        </p>
      ) : null}
    </Card>
  );
}
