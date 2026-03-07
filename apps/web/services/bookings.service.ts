import { apiRequest } from '../lib/api';

export async function createBooking(payload: {
  listingId: string;
  startDate: string;
  endDate: string;
  guests: number;
}) {
  return apiRequest('/bookings', {
    method: 'POST',
    body: payload,
  });
}

export async function getMyBookings() {
  return apiRequest('/users/me/bookings', { cacheTtlMs: 30_000 });
}

export async function getHostBookings() {
  return apiRequest('/hosts/me/bookings', { cacheTtlMs: 30_000 });
}
