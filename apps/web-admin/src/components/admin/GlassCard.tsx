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
        'rounded-2xl border border-zinc-200/80 bg-white/75 p-6 shadow-soft backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
