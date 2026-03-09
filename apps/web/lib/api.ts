type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
  cacheTtlMs?: number;
};

// Use NEXT_PUBLIC_API_URL; normalize: missing https:// causes relative fetch → Vercel 404.
// Force https when page is https (fixes CORS when API URL was set as http)
function normalizeApiUrl(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return 'http://localhost:3001';
  let url = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && url.startsWith('http://')) {
    url = 'https://' + url.slice(7);
  }
  return url;
}
export const API_BASE_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001');
const memoryCache = new Map<string, { expiresAt: number; value: unknown }>();

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const url = `${API_BASE_URL}${path}`;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const cacheKey = `${method}:${url}:${JSON.stringify(isFormData ? null : (options.body ?? null))}`;
  const now = Date.now();

  if (method === 'GET' && options.cacheTtlMs && memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }
    memoryCache.delete(cacheKey);
  }

  const response = await fetch(url, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...getAuthHeaders(),
      ...options.headers,
    },
    body: options.body ? (isFormData ? (options.body as FormData) : JSON.stringify(options.body)) : undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `API request failed (${response.status})`);
  }

  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error('API returned non-JSON response');
  }

  if (method === 'GET' && options.cacheTtlMs) {
    memoryCache.set(cacheKey, {
      value: data,
      expiresAt: now + options.cacheTtlMs,
    });
  }

  return data;
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') {
    return {};
  }
  const token = localStorage.getItem('locus_token') ?? '';
  const userId = localStorage.getItem('locus_user_id') ?? '';
  const userRole = localStorage.getItem('locus_user_role') ?? 'USER';
  if (!token && !userId) {
    return {};
  }
  const headers: Record<string, string> = {};
  if (userId) {
    headers['x-user-id'] = userId;
    headers['x-user-role'] = userRole;
  }
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}
