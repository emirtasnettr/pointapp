'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const authFieldClass =
  'mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand/45 focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60';

export const authTextareaClass = cn(authFieldClass, 'min-h-[96px] resize-y');

export function AuthPageBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 top-[calc(6rem*1.15)] h-72 bg-gradient-to-b from-brand/[0.12] via-brand/[0.04] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-40 h-64 w-64 rounded-full bg-brand/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-[28rem] h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl"
        aria-hidden
      />
    </>
  );
}

export function AuthPageHero({
  badge,
  title,
  description,
  icon: Icon,
}: {
  badge: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="text-center lg:text-left">
      <p className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {badge}
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">{description}</p>
    </div>
  );
}

export function AuthGlassCard({
  children,
  className,
  padding = 'default',
}: {
  children: ReactNode;
  className?: string;
  padding?: 'default' | 'none';
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-zinc-200/80 bg-white/80 shadow-soft backdrop-blur-xl',
        padding === 'default' && 'p-6 sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AuthBrandPanel({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-brand p-8 text-white sm:p-10">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-black/10 to-transparent" aria-hidden />
      <div className="relative">{children}</div>
    </div>
  );
}

export function AuthField({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function AuthInputWrap({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
      <div className="[&_input]:pl-10 [&_textarea]:pl-10">{children}</div>
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  disabled,
  type = 'button',
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-2xl bg-gradient-to-r from-[#3edd7a] via-brand to-[#129a40] py-3.5 text-sm font-bold text-white shadow-soft transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function AuthOutlineButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/30 bg-brand/10 py-3 text-sm font-semibold text-brand shadow-sm transition hover:border-brand/45 hover:bg-brand/15 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function AuthErrorAlert({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-2xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
        !
      </span>
      <span>{message}</span>
    </div>
  );
}

export function AuthDemoHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-brand/15 bg-gradient-to-br from-brand/[0.06] to-transparent px-4 py-3 text-xs leading-relaxed text-zinc-600">
      {children}
    </p>
  );
}

export function AuthSectionCard({
  title,
  subtitle,
  icon: Icon,
  step,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  step?: number;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-sm">
      <div className="flex items-start gap-3 border-b border-zinc-100 bg-gradient-to-r from-zinc-50/90 to-white px-5 py-4 sm:px-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          {step != null ? (
            <span className="text-sm font-bold">{step}</span>
          ) : (
            <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
          )}
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-base font-bold tracking-tight text-zinc-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-zinc-600">{subtitle}</p> : null}
        </div>
      </div>
      <div className="space-y-4 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function AuthTypeChip({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
        selected
          ? 'border-brand bg-brand text-white shadow-sm'
          : 'border-zinc-200/90 bg-white text-zinc-700 hover:border-brand/35 hover:bg-brand/[0.04]',
        disabled && 'opacity-60',
      )}
    >
      {label}
    </button>
  );
}

export function AuthFooterLink({ children }: { children: ReactNode }) {
  return <p className="text-center text-sm text-zinc-600">{children}</p>;
}
