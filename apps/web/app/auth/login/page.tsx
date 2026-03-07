'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { Button, Input } from '../../../components/ui';
import { login } from '../../../services/auth';
import { useAuthStore } from '../../../store/useAuthStore';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, setSession } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    setSession: state.setSession,
  }));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Заполните email и пароль.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await login({ email, password });
      setSession(session);
      setSuccess('Вход выполнен успешно.');
      router.push('/dashboard');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Не удалось выполнить вход.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Войти</h1>
      <p className="mt-2 text-sm text-slate-600">Введите данные аккаунта для входа в LOCUS.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Пароль
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            placeholder="********"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Входим...' : 'Войти'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Нет аккаунта?{' '}
        <Link href="/auth/register" className="font-medium text-slate-900 underline">
          Создать аккаунт
        </Link>
      </p>
    </div>
  );
}
