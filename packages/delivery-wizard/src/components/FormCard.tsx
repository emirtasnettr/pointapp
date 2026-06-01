import type { ReactNode } from 'react';

export function FormCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/50">
      <h2 className="text-[17px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
      {subtitle ? (
        <p className="mb-3.5 mt-1 text-[13px] leading-snug text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      ) : (
        <div className="mb-3.5" />
      )}
      {children}
    </section>
  );
}
