type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
  cacheTtlMs?: number;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API request failed (${response.status})`);
  }

  const data = (await response.json()) as T;

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
