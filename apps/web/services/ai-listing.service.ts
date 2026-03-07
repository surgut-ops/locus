import { apiRequest } from '../lib/api';

export type AiListingAnalyzeResponse = {
  title: string;
  description: string;
  amenities: string[];
  roomType: 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM' | 'VILLA' | 'HOTEL';
  suggestedPrice: number;
};

export async function analyzeListingImage(file: File): Promise<AiListingAnalyzeResponse> {
  const formData = new FormData();
  formData.append('image', file);

  return apiRequest<AiListingAnalyzeResponse>('/ai-listing/analyze', {
    method: 'POST',
    body: formData,
  });
}
