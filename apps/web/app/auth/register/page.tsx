'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { Button, Input } from '../../../components/ui';
import { register } from '../../../services/auth';
import { useAuthStore } from '../../../store/useAuthStore';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') ?? undefined;
  const { isAuthenticated, setSession } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    setSession: state.setSession,
  }));

  const [name, setName] = useState('');
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

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Заполните имя, email и пароль.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await register({ name, email, password, referralCode: refCode });
      setSession(session);
      setSuccess('Аккаунт успешно создан.');
      router.push('/dashboard');
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Не удалось создать аккаунт.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Создать аккаунт</h1>
      <p className="mt-2 text-sm text-slate-600">Зарегистрируйтесь, чтобы пользоваться LOCUS.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Имя
          </label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
            placeholder="Иван Иванов"
          />
        </div>

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
            autoComplete="new-password"
            value={password}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            placeholder="Минимум 8 символов"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Создаем...' : 'Создать аккаунт'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Уже есть аккаунт?{' '}
        <Link href="/auth/login" className="font-medium text-slate-900 underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
