'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  FileText,
  MapPin,
  Package,
  Truck,
  UserRound,
} from 'lucide-react';
import { apiGetAuth, openCustomerDeliveryInvoice } from '@/lib/api';
import { DeliveryInvoiceBadge } from '@/lib/delivery-invoice-badge';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import { formatTry } from '@/lib/format';
import { cn } from '@/lib/cn';

const TYPE_TR: Record<string, string> = {
  DOCUMENT: 'Evrak',
  PACKAGE: 'Paket',
};

const PAYMENT_METHOD_TR: Record<string, string> = {
  CARD: 'Kredi kartı',
  INVOICE_ACCOUNT: 'Cari hesap',
  WALLET: 'Cüzdan',
};

const PAYMENT_STATUS_TR: Record<string, string> = {
  PENDING: 'Bekliyor',
  AUTHORIZED: 'Onaylandı',
  CAPTURED: 'Tahsil edildi',
  FAILED: 'Başarısız',
  REFUNDED: 'İade edildi',
};

type AddressSnapshot = {
  label?: string | null;
  line1?: string | null;
  city?: string | null;
};

type Delivery = {
  orderNumber: number;
  status: string;
  type?: string;
  description?: string | null;
  notes?: string | null;
  weightKg?: string | null;
  pickupAddress: AddressSnapshot;
  dropoffAddress: AddressSnapshot;
  senderName?: string | null;
  recipientName?: string | null;
  totalPrice: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  courier?: {
    displayNameMasked?: string | null;
  } | null;
  statusLogs?: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    createdAt: string;
  }>;
  customerInvoiceCount?: number;
  customerInvoices?: Array<{
    id: string;
    invoiceNumber: string | null;
    fileName: string;
    createdAt: string;
    orderNumbers: number[];
    deliveryCount: number;
  }>;
};

const sectionClass =
  'rounded-xl border border-zinc-200/80 bg-white shadow-soft dark:border-white/10 dark:bg-zinc-900/50';

const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wide text-zinc-500';

function isActiveStatus(status: string) {
  return !['DELIVERED', 'CANCELLED'].includes(status);
}

function paymentMethodLabel(method: string) {
  return PAYMENT_METHOD_TR[method] ?? method;
}

function paymentStatusLabel(status: string) {
  return PAYMENT_STATUS_TR[status] ?? status;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const active = isActiveStatus(status);
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
        active
          ? 'border-zinc-300 bg-zinc-50 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
          : status === 'CANCELLED'
            ? 'border-red-200/80 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
            : 'border-zinc-200/80 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300',
      )}
    >
      {deliveryStatusLabel(status)}
    </span>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(sectionClass, 'p-4', className)}>
      <h2 className={sectionTitleClass}>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-2 last:border-0 last:pb-0 first:pt-0 dark:border-white/10">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

function AddressStop({
  kind,
  address,
}: {
  kind: 'pickup' | 'dropoff';
  address: AddressSnapshot;
}) {
  const label = (address.label ?? '').trim();
  const line1 = (address.line1 ?? '').trim();
  const city = (address.city ?? '').trim();
  const title = kind === 'pickup' ? 'Alış noktası' : 'Teslim noktası';

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/90 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
        <MapPin className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
        {label ? <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{label}</p> : null}
        {line1 ? (
          <p className={cn('text-sm text-zinc-700 dark:text-zinc-300', label ? 'mt-0.5' : 'mt-1')}>
            {line1}
          </p>
        ) : null}
        {city ? <p className="mt-0.5 text-xs text-zinc-500">{city}</p> : null}
        {!label && !line1 && !city ? (
          <p className="mt-1 text-sm text-zinc-500">Adres bilgisi yok</p>
        ) : null}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-zinc-200 dark:bg-white/10" />
      <div className="h-24 rounded-xl bg-zinc-200 dark:bg-white/10" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 rounded-xl bg-zinc-200 lg:col-span-2 dark:bg-white/10" />
        <div className="h-48 rounded-xl bg-zinc-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

export function OrderDetailClient({ refParam }: { refParam: string }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['customer', 'delivery', refParam],
    queryFn: () => apiGetAuth<Delivery>(`/customer/deliveries/${encodeURIComponent(refParam)}`),
  });

  if (isPending) {
    return <DetailSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {(error as Error)?.message ?? 'Sipariş bulunamadı veya erişim yok.'}
        </p>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Siparişlere dön
        </Link>
      </div>
    );
  }

  const d = data;
  const active = isActiveStatus(d.status);
  const logs = d.statusLogs?.length ? [...d.statusLogs].reverse() : [];
  const showPackage =
    d.type === 'PACKAGE' || Boolean(d.description?.trim()) || Boolean(d.notes?.trim());
  const showContacts = Boolean(d.senderName?.trim() || d.recipientName?.trim());

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Siparişlere dön
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Sipariş #{d.orderNumber}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">{formatDateTime(d.createdAt)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={d.status} />
              <DeliveryInvoiceBadge status={d.status} customerInvoiceCount={d.customerInvoiceCount} />
              {d.type ? (
                <span className="inline-flex rounded-full border border-zinc-200/80 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                  {TYPE_TR[d.type] ?? d.type}
                </span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={sectionTitleClass}>Toplam</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatTry(d.totalPrice)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Güzergâh">
            <div className="space-y-3">
              <AddressStop kind="pickup" address={d.pickupAddress} />
              <div className="flex items-center gap-3 pl-4">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-white/10" aria-hidden />
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                <span className="h-px flex-1 bg-zinc-200 dark:bg-white/10" aria-hidden />
              </div>
              <AddressStop kind="dropoff" address={d.dropoffAddress} />
            </div>
          </Section>

          {showContacts ? (
            <Section title="İletişim">
              <dl className="divide-y divide-zinc-100 dark:divide-white/10">
                {d.senderName?.trim() ? (
                  <div className="flex gap-3 py-2 first:pt-0 last:pb-0">
                    <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                    <div>
                      <dt className="text-xs text-zinc-500">Gönderen</dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {d.senderName.trim()}
                      </dd>
                    </div>
                  </div>
                ) : null}
                {d.recipientName?.trim() ? (
                  <div className="flex gap-3 py-2 first:pt-0 last:pb-0">
                    <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                    <div>
                      <dt className="text-xs text-zinc-500">Alıcı</dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {d.recipientName.trim()}
                      </dd>
                    </div>
                  </div>
                ) : null}
              </dl>
            </Section>
          ) : null}

          {showPackage ? (
            <Section title={d.type === 'PACKAGE' ? 'Paket bilgisi' : 'Not'}>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200/90 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-white/5">
                  <Package className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  {d.type === 'PACKAGE' ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Tür: {TYPE_TR[d.type] ?? d.type}
                      {d.weightKg ? ` · ${d.weightKg} kg` : ''}
                    </p>
                  ) : null}
                  {d.description?.trim() ? (
                    <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {d.description.trim()}
                    </p>
                  ) : d.type === 'PACKAGE' ? (
                    <p className="text-sm text-zinc-500">İçerik belirtilmemiş</p>
                  ) : null}
                  {d.notes?.trim() ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">Operasyon notu: </span>
                      {d.notes.trim()}
                    </p>
                  ) : null}
                </div>
              </div>
            </Section>
          ) : null}

          {logs.length > 0 ? (
            <Section title="Durum geçmişi">
              <ol className="relative space-y-0 border-l border-zinc-200 pl-5 dark:border-white/10">
                {logs.map((log, index) => (
                  <li key={log.id} className="relative pb-4 last:pb-0">
                    <span
                      className={cn(
                        'absolute -left-[1.35rem] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-4 ring-white dark:ring-zinc-900',
                        index === 0 ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-600',
                      )}
                      aria-hidden
                    />
                    <p
                      className={cn(
                        'text-sm font-medium',
                        index === 0
                          ? 'text-zinc-900 dark:text-zinc-50'
                          : 'text-zinc-700 dark:text-zinc-300',
                      )}
                    >
                      {deliveryStatusLabel(log.toStatus)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{formatDateTime(log.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Section title="Ödeme özeti">
            <dl>
              <SummaryRow label="Yöntem" value={paymentMethodLabel(d.paymentMethod)} />
              <SummaryRow label="Durum" value={paymentStatusLabel(d.paymentStatus)} />
              <SummaryRow label="Tutar" value={formatTry(d.totalPrice)} />
            </dl>
          </Section>

          {active ? (
            <Section title="Takip">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200/90 bg-zinc-50 dark:border-white/10 dark:bg-white/5">
                  <Truck className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" aria-hidden />
                </span>
                <div>
                  {d.courier?.displayNameMasked ? (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      Kurye:{' '}
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {d.courier.displayNameMasked}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {d.status === 'POOL'
                        ? 'Uygun kurye aranıyor. Atandığında bilgi burada güncellenir.'
                        : 'Kurye bilgisi kısa süre içinde görünecek.'}
                    </p>
                  )}
                  <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                    Güncel durum için sayfayı yenileyebilirsiniz. Canlı konum takibi mobil uygulamada
                    sunulacaktır.
                  </p>
                </div>
              </div>
            </Section>
          ) : null}

          {d.status === 'DELIVERED' ? (
            <Section title="Faturalar">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <DeliveryInvoiceBadge status={d.status} customerInvoiceCount={d.customerInvoiceCount} />
              </div>
              {(d.customerInvoices?.length ?? 0) > 0 ? (
                <ul className="space-y-2">
                  {d.customerInvoices!.map((inv) => (
                    <li key={inv.id}>
                      <button
                        type="button"
                        onClick={() => void openCustomerDeliveryInvoice(inv.id)}
                        className="flex w-full items-start gap-2.5 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.07]"
                      >
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {inv.invoiceNumber || inv.fileName}
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {formatDateTime(inv.createdAt)}
                            {inv.deliveryCount > 1
                              ? ` · ${inv.deliveryCount} sipariş (birleşik fatura)`
                              : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Faturanız hazırlanıyor. Yüklendiğinde buradan görüntüleyebilirsiniz.
                </p>
              )}
            </Section>
          ) : null}

          {!active && d.status !== 'DELIVERED' ? (
            <div className={cn(sectionClass, 'flex gap-3 p-4')}>
              <Banknote className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Bu sipariş {deliveryStatusLabel(d.status).toLowerCase()}. Yeni gönderi için teslimat
                oluşturabilirsiniz.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
