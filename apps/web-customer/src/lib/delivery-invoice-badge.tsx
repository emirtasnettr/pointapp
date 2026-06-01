import { cn } from '@/lib/cn';

export type DeliveryInvoiceBadgeKind = 'none' | 'preparing' | 'ready';

export function deliveryInvoiceBadgeKind(
  status: string,
  customerInvoiceCount?: number,
): DeliveryInvoiceBadgeKind {
  if (status !== 'DELIVERED') return 'none';
  return (customerInvoiceCount ?? 0) > 0 ? 'ready' : 'preparing';
}

const BADGE_CLASS: Record<Exclude<DeliveryInvoiceBadgeKind, 'none'>, string> = {
  preparing:
    'bg-amber-50 text-amber-900 ring-1 ring-amber-200/90 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-500/30',
  ready:
    'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/90 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-500/30',
};

const BADGE_LABEL: Record<Exclude<DeliveryInvoiceBadgeKind, 'none'>, string> = {
  preparing: 'Fatura Hazırlanıyor',
  ready: 'Fatura Var',
};

export function DeliveryInvoiceBadge({
  status,
  customerInvoiceCount,
  className,
}: {
  status: string;
  customerInvoiceCount?: number;
  className?: string;
}) {
  const kind = deliveryInvoiceBadgeKind(status, customerInvoiceCount);
  if (kind === 'none') return null;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold leading-tight',
        BADGE_CLASS[kind],
        className,
      )}
    >
      {BADGE_LABEL[kind]}
    </span>
  );
}
