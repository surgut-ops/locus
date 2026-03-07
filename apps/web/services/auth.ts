import { apiRequest } from '../lib/api';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  name: string;
  avatar: string | null;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  referralCode?: string;
};

const TOKEN_STORAGE_KEY = 'locus_token';
const USER_STORAGE_KEY = 'locus_auth_user';

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
  persistSession(response);
  return response;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
  persistSession(response);
  return response;
}

export function logout(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem('locus_user_id');
  localStorage.removeItem('locus_user_role');
}

export async function getCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/users/me', { cacheTtlMs: 5_000 });
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function persistSession(session: AuthResponse): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
  localStorage.setItem('locus_user_id', session.user.id);
  localStorage.setItem('locus_user_role', session.user.role);
}
