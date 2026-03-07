export type HeatmapDistrictItem = {
  district: string;
  averagePrice: number;
  listingCount: number;
  demandScore: number;
  heatmapScore: number;
  latitude: number | null;
  longitude: number | null;
};

export type HeatmapCityResponse = {
  city: string;
  districts: HeatmapDistrictItem[];
};

export class HeatmapError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HeatmapError';
    this.statusCode = statusCode;
  }
}
