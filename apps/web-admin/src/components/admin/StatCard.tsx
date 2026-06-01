import { GlassCard } from './GlassCard';
import { cn } from '@/lib/cn';

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <GlassCard className={cn('p-5', className)}>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </GlassCard>
  );
}
