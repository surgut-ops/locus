import type { ReactNode } from 'react';

type PageSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function PageSection({ title, subtitle, children }: PageSectionProps) {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
