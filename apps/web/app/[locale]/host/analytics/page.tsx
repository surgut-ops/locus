'use client';

import { useState } from 'react';

import { Button, Card, Input } from '@locus/ui';

import { PriceSuggestionEditor } from '../../../../components/PriceSuggestionEditor';
import {
  fetchInvestmentAnalysis,
  fetchMarketHeatmap,
  type HeatmapDistrict,
  type InvestmentAnalysis,
} from '../../../../services/ai-advanced.service';
import { useHydrateAuth } from '../../../../hooks/useHydrateAuth';
import { useAppStore } from '../../../../store/app.store';

export default function HostAnalyticsPage() {
  useHydrateAuth();
  const auth = useAppStore((state) => state.auth);
  const isAllowed = auth.role === 'HOST' || auth.role === 'ADMIN' || auth.role === 'MODERATOR';

  const [city, setCity] = useState('Dubai');
  const [budget, setBudget] = useState('200000');
  const [propertyType, setPropertyType] = useState('APARTMENT');
  const [listingId, setListingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<InvestmentAnalysis | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapDistrict[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const onAnalyze = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const [investment, districts] = await Promise.all([
        fetchInvestmentAnalysis({
          city,
          budget: Number(budget),
          propertyType: propertyType || undefined,
        }),
        fetchMarketHeatmap(city),
      ]);
      setAnalysis(investment);
      setHeatmap(districts.slice(0, 8));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load analytics');
      setAnalysis(null);
      setHeatmap([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAllowed) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Host Analytics</h1>
        <p className="mt-2 text-sm text-slate-600">Host role required to access advanced analytics.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h1 className="text-2xl font-bold">Host Analytics</h1>
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={city} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCity(event.target.value)} placeholder="City" />
          <Input
            type="number"
            min={1}
            value={budget}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setBudget(event.target.value)}
            placeholder="Budget"
          />
          <Input
            value={propertyType}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPropertyType(event.target.value.toUpperCase())}
            placeholder="Property type (APARTMENT)"
          />
        </div>
        <Button onClick={onAnalyze} disabled={loading}>
          {loading ? 'Analyzing...' : 'Run investment analysis'}
        </Button>
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold">Investment insights</h2>
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          {analysis?.bestInvestmentAreas.map((area) => (
            <p key={area.district}>
              {area.district}: ROI {area.expectedROI}% | Occupancy {Math.round(area.averageOccupancy * 100)}% |
              Avg nightly ${area.averagePrice}
            </p>
          )) ?? <p>No data yet. Run analysis.</p>}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold">Market heatmap</h2>
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          {heatmap.map((item) => (
            <p key={item.district}>
              {item.district}: demand intensity {item.demandIntensity}
            </p>
          ))}
          {heatmap.length === 0 ? <p>No heatmap data yet.</p> : null}
        </div>
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="text-lg font-semibold">Price suggestion in listing editor</h2>
        <Input
          value={listingId}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setListingId(event.target.value)}
          placeholder="Listing ID for AI recommendation"
        />
        {listingId.trim() ? (
          <PriceSuggestionEditor listingId={listingId.trim()} />
        ) : (
          <p className="text-sm text-slate-600">Enter listing ID to show AI price suggestion.</p>
        )}
      </Card>
    </div>
  );
}
