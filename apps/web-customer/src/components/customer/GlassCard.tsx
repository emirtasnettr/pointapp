import { cn } from '@/lib/cn';

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200/80 bg-white/70 p-4 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]',
        className,
      )}
    >
      {children}
    </div>
  );
}
