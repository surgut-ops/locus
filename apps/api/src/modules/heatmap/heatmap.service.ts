import type { HeatmapRepository, DistrictRawRow } from './heatmap.repository.js';
import type { HeatmapCityResponse, HeatmapDistrictItem } from './heatmap.types.js';
import { HeatmapError } from './heatmap.types.js';

const SCORE_MAX = 100;

export class HeatmapService {
  public constructor(private readonly repository: HeatmapRepository) {}

  public async getCityHeatmap(city: string): Promise<HeatmapCityResponse> {
    const cityTrimmed = city?.trim();
    if (!cityTrimmed) {
      throw new HeatmapError('City is required', 400);
    }

    const rows = await this.repository.getDistrictStatsByCity(cityTrimmed);
    if (rows.length === 0) {
      return { city: cityTrimmed, districts: [] };
    }

    const maxBookings = Math.max(1, ...rows.map((r) => r.bookingsCount));
    const maxViews = Math.max(1, ...rows.map((r) => r.viewsCount));
    const maxListings = Math.max(1, ...rows.map((r) => r.listingCount));

    const districts: HeatmapDistrictItem[] = rows.map((row) => {
      const demandScore = this.calculateDemandScore(
        row.bookingsCount,
        row.viewsCount,
        maxBookings,
        maxViews,
      );
      const heatmapScore = this.calculateHeatmapScore(
        row,
        demandScore,
        maxListings,
      );

      return {
        district: row.district,
        averagePrice: Math.round(row.averagePrice * 100) / 100,
        listingCount: row.listingCount,
        demandScore: Math.round(demandScore),
        heatmapScore: Math.round(heatmapScore),
        latitude: row.avgLat,
        longitude: row.avgLng,
      };
    });

    districts.sort((a, b) => b.heatmapScore - a.heatmapScore);

    return { city: cityTrimmed, districts };
  }

  private calculateDemandScore(
    bookings: number,
    views: number,
    maxBookings: number,
    maxViews: number,
  ): number {
    const normBookings = maxBookings > 0 ? (bookings / maxBookings) * 50 : 0;
    const normViews = maxViews > 0 ? Math.min(1, views / Math.max(100, maxViews)) * 50 : 0;
    return Math.min(SCORE_MAX, normBookings + normViews);
  }

  private calculateHeatmapScore(row: DistrictRawRow, demandScore: number, maxListings: number): number {
    const listingWeight = maxListings > 0 ? (row.listingCount / maxListings) * 30 : 0;
    const demandWeight = demandScore * 0.7;
    return Math.min(SCORE_MAX, listingWeight + demandWeight);
  }
}
