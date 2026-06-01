'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Clock,
  Hash,
  Inbox,
  Layers2,
  Package,
  PackageOpen,
  RefreshCw,
  Search,
  Siren,
  Truck,
  UserRound,
  UserRoundCheck,
  X,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { apiBase, apiGet, apiTimeoutSignal, staffAuthHeaders, staffParseJsonRes } from '@/lib/api';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import { cn } from '@/lib/cn';
import { formatTry } from '@/lib/format';

type UrgentNoCourierResponse = {
  items: Array<{
    id: string;
    orderNumber: number;
    type: string;
    createdAt: string;
    customer: { publicId: string; displayName: string };
  }>;
};

const DELIVERY_TYPE_TR: Record<string, string> = {
  DOCUMENT: 'Evrak',
  PACKAGE: 'Paket',
};

type DeliveryStats = {
  total: number;
  delivered: number;
  onTheWay: number;
  cancelled: number;
};

type ListResponse = {
  items: Array<{
    id: string;
    orderNumber: number;
    status: string;
    totalPrice: string;
    createdAt: string;
    customer: { publicId: string; displayName: string };
    courier: { publicId: string; displayName: string } | null;
  }>;
  total: number;
};

const STATUS_BADGE: Record<
  string,
  { Icon: React.ComponentType<{ className?: string }>; ring: string; bg: string; text: string }
> = {
  PENDING: {
    Icon: Clock,
    ring: 'ring-amber-500/20',
    bg: 'bg-amber-500/10',
    text: 'text-amber-800',
  },
  POOL: {
    Icon: Layers2,
    ring: 'ring-blue-500/20',
    bg: 'bg-blue-500/10',
    text: 'text-blue-800',
  },
  COURIER_ASSIGNED: {
    Icon: UserRoundCheck,
    ring: 'ring-brand/30',
    bg: 'bg-brand/12',
    text: 'text-emerald-900',
  },
  COURIER_EN_ROUTE: {
    Icon: Truck,
    ring: 'ring-brand/30',
    bg: 'bg-brand/15',
    text: 'text-emerald-900',
  },
  PACKAGE_PICKED_UP: {
    Icon: PackageOpen,
    ring: 'ring-emerald-600/25',
    bg: 'bg-emerald-500/12',
    text: 'text-emerald-900',
  },
  DELIVERED: {
    Icon: CircleCheck,
    ring: 'ring-zinc-400/30',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-700',
  },
  CANCELLED: {
    Icon: XCircle,
    ring: 'ring-red-400/25',
    bg: 'bg-red-500/10',
    text: 'text-red-800',
  },
};

function StatusCell({ status, compact }: { status: string; compact?: boolean }) {
  const cfg = STATUS_BADGE[status] ?? {
    Icon: Package,
    ring: 'ring-zinc-400/20',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-700',
  };
  const Icon = cfg.Icon;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full font-medium ring-1 ring-inset',
        compact ? 'gap-0.5 px-1.5 py-0.5 text-[10px] leading-tight' : 'gap-1.5 px-2.5 py-1 text-xs',
        cfg.ring,
        cfg.bg,
        cfg.text,
      )}
    >
      <Icon className={cn('shrink-0 opacity-90', compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5')} />
      <span className="truncate">{deliveryStatusLabel(status)}</span>
    </span>
  );
}

async function fetchOrders(search: string): Promise<ListResponse> {
  const params = new URLSearchParams({ take: '100', excludeDelivered: 'true' });
  const s = search.trim();
  if (s) params.set('search', s);
  const res = await fetch(`${apiBase()}/deliveries?${params.toString()}`, {
    cache: 'no-store',
    headers: staffAuthHeaders(),
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<ListResponse>(res);
}

async function fetchDeliveryStats(): Promise<DeliveryStats> {
  return apiGet<DeliveryStats>('/deliveries/stats');
}

async function fetchUrgentNoCourier(): Promise<UrgentNoCourierResponse> {
  return apiGet<UrgentNoCourierResponse>('/deliveries/urgent-no-courier');
}

function StatCard({
  label,
  value,
  hint,
  Icon,
  accentClass,
}: {
  label: string;
  value: number | string;
  hint?: string;
  Icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-soft backdrop-blur-md">
      <div className={cn('absolute right-3 top-3 rounded-xl p-2 ring-1 ring-inset', accentClass)}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="pr-14 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-[10px] leading-snug text-zinc-400">{hint}</p> : null}
    </div>
  );
}

export default function OrdersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const listQuery = useQuery({
    queryKey: ['deliveries', 'admin-list', debouncedSearch],
    queryFn: () => fetchOrders(debouncedSearch),
    retry: 1,
  });
  const statsQuery = useQuery({
    queryKey: ['deliveries', 'admin-stats'],
    queryFn: fetchDeliveryStats,
    retry: 1,
  });
  const urgentQuery = useQuery({
    queryKey: ['deliveries', 'urgent-no-courier'],
    queryFn: fetchUrgentNoCourier,
    retry: 1,
    refetchInterval: 60_000,
  });

  const { data, isPending, isError, error, refetch, isFetching } = listQuery;
  const router = useRouter();

  return (
    <>
      <PageHeader
        title="Operasyon Yönetimi"
        description="Sipariş no, müşteri veya kurye ile arayın; satıra tıklayarak detaya gidin."
        actions={
          <button
            type="button"
            onClick={() => {
              void refetch();
              void statsQuery.refetch();
              void urgentQuery.refetch();
            }}
            disabled={isFetching || statsQuery.isFetching || urgentQuery.isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-soft backdrop-blur-sm transition hover:border-brand/35 hover:bg-brand/[0.06] hover:text-zinc-900 disabled:opacity-60"
          >
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5 text-brand',
                (isFetching || statsQuery.isFetching || urgentQuery.isFetching) && 'animate-spin',
              )}
            />
            Yenile
          </button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Teslimat sayısı"
          value={statsQuery.isPending ? '…' : (statsQuery.data?.total ?? 0)}
          Icon={Package}
          accentClass="bg-brand/12 ring-brand/20 text-brand"
        />
        <StatCard
          label="Teslim edilen"
          value={statsQuery.isPending ? '…' : (statsQuery.data?.delivered ?? 0)}
          Icon={CircleCheck}
          accentClass="bg-zinc-500/10 ring-zinc-400/25 text-zinc-600"
        />
        <StatCard
          label="Yolda"
          value={statsQuery.isPending ? '…' : (statsQuery.data?.onTheWay ?? 0)}
          hint="Kurye yola çıktı veya paket alındı"
          Icon={Truck}
          accentClass="bg-brand/14 ring-brand/25 text-emerald-800"
        />
        <StatCard
          label="İptal"
          value={statsQuery.isPending ? '…' : (statsQuery.data?.cancelled ?? 0)}
          Icon={XCircle}
          accentClass="bg-red-500/10 ring-red-400/20 text-red-700"
        />
      </div>

      <section
        className={cn(
          'mb-6 rounded-2xl border p-4 shadow-soft backdrop-blur-md sm:p-5',
          urgentQuery.data?.items.length
            ? 'border-rose-200/70 bg-rose-50/40'
            : 'border-zinc-200/80 bg-white/70',
        )}
        aria-label="Acil durum"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Siren
            className={cn(
              'h-4 w-4 shrink-0',
              urgentQuery.data?.items.length ? 'text-rose-500/85' : 'text-zinc-400',
            )}
            aria-hidden
          />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Acil durum</h2>
          <span className="text-[11px] font-normal text-zinc-500">
            (30 dk+ · kurye yok · beklemede / havuz)
          </span>
        </div>
        {urgentQuery.isPending ? (
          <p className="text-xs text-zinc-500">Kontrol ediliyor…</p>
        ) : urgentQuery.isError ? (
          <p className="text-xs text-red-700">{(urgentQuery.error as Error).message}</p>
        ) : urgentQuery.data?.items.length ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {urgentQuery.data.items.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => router.push(`/orders/${u.orderNumber}`)}
                className="rounded-xl border border-rose-100/95 bg-white/90 p-3 text-left shadow-sm ring-1 ring-rose-100/30 transition hover:border-rose-200 hover:bg-white hover:shadow-md hover:ring-rose-200/40"
              >
                <p className="font-mono text-sm font-bold tabular-nums text-brand">#{u.orderNumber}</p>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{u.customer.displayName}</p>
                <p className="mt-0.5 text-xs text-zinc-600">{DELIVERY_TYPE_TR[u.type] ?? u.type}</p>
                <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                  <span className="font-semibold text-zinc-400">Oluşturulma · </span>
                  {new Date(u.createdAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-600">
            Her şey yolunda, şimdi derin bir nefes al
          </p>
        )}
      </section>

      {statsQuery.isError ? (
        <p className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 shadow-soft backdrop-blur-sm">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>Özet yüklenemedi: {(statsQuery.error as Error).message}</span>
        </p>
      ) : null}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Sipariş no, müşteri veya kurye ara…"
            autoComplete="off"
            className="w-full rounded-xl border border-zinc-200/90 bg-white/90 py-2.5 pl-10 pr-10 text-sm text-zinc-900 shadow-soft outline-none ring-zinc-200/80 transition placeholder:text-zinc-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/15"
            aria-label="Teslimat ara"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Aramayı temizle"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/60 px-3 py-2 text-xs text-zinc-500 backdrop-blur-md">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
        {debouncedSearch ? (
          <>
            Arama: <span className="font-medium text-zinc-700">&quot;{debouncedSearch}&quot;</span> · Eşleşen:{' '}
            <span className="font-medium text-zinc-700">{data?.total ?? (isPending ? '…' : '0')}</span>
            {data && data.items.length < data.total ? (
              <span className="text-zinc-400"> (ilk 100 gösterilir)</span>
            ) : null}
          </>
        ) : (
          <>
            Teslim edilenler hariç son 100 kayıt · Toplam (filtreli):{' '}
            <span className="font-medium text-zinc-700">{data?.total ?? (isPending ? '…' : '0')}</span>
          </>
        )}
      </div>

      {isError ? (
        <p className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-800 shadow-soft backdrop-blur-sm">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{(error as Error).message}</span>
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white/85 shadow-[0_6px_28px_-10px_rgba(0,0,0,0.1)] backdrop-blur-xl">
        <div className="max-h-[min(52vh,420px)] overflow-x-auto overflow-y-auto overscroll-contain">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-zinc-200/90 bg-zinc-50/95 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 backdrop-blur-md">
              <tr>
                <th className="px-3 py-2 pl-4 sm:pl-5">
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3 w-3 text-zinc-400" aria-hidden />
                    Sipariş
                  </span>
                </th>
                <th className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="h-3 w-3 text-zinc-400" aria-hidden />
                    Müşteri
                  </span>
                </th>
                <th className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <Truck className="h-3 w-3 text-zinc-400" aria-hidden />
                    Kurye
                  </span>
                </th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <Banknote className="h-3 w-3 text-zinc-400" aria-hidden />
                    Tutar
                  </span>
                </th>
                <th className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3 text-zinc-400" aria-hidden />
                    Tarih
                  </span>
                </th>
                <th className="w-8 px-2 py-2 pr-3 sm:pr-4" aria-hidden>
                  <span className="sr-only">Detay</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100/80 text-zinc-800">
              {isPending ? (
                <tr>
                  <td className="px-4 py-8 sm:px-5" colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <RefreshCw className="h-6 w-6 animate-spin text-brand/70" aria-hidden />
                      <span className="text-xs font-medium">Siparişler yükleniyor…</span>
                    </div>
                  </td>
                </tr>
              ) : data?.items.length ? (
                data.items.map((d) => {
                  const href = `/orders/${d.orderNumber}`;
                  return (
                    <tr
                      key={d.id}
                      tabIndex={0}
                      aria-label={`Sipariş ${d.orderNumber}, detayı aç`}
                      className="cursor-pointer transition-colors hover:bg-brand/[0.05] focus-visible:bg-brand/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35"
                      onClick={() => router.push(href)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(href);
                        }
                      }}
                    >
                      <td className="max-w-[7rem] px-3 py-1.5 pl-4 sm:pl-5">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tabular-nums text-brand">
                          <span className="rounded-md bg-brand/10 px-1.5 py-0.5 ring-1 ring-brand/12">#{d.orderNumber}</span>
                        </span>
                      </td>
                      <td className="max-w-[10rem] px-3 py-1.5">
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-zinc-700">
                          <UserRound className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden />
                          <span className="truncate font-medium text-zinc-800">{d.customer.displayName}</span>
                        </span>
                      </td>
                      <td className="max-w-[9rem] px-3 py-1.5">
                        {d.courier ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-zinc-700">
                            <Truck className="h-3 w-3 shrink-0 text-brand/70" aria-hidden />
                            <span className="truncate font-medium text-zinc-800">{d.courier.displayName}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
                            <Inbox className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">Kurye aranıyor</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 align-middle">
                        <StatusCell status={d.status} compact />
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <span className="inline-flex items-center gap-1 font-medium tabular-nums text-zinc-900">
                          <Banknote className="h-3 w-3 text-zinc-400" aria-hidden />
                          {formatTry(d.totalPrice)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-[11px] text-zinc-500">
                        {new Date(d.createdAt).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-2 py-1.5 pr-3 text-zinc-300 sm:pr-4">
                        <ChevronRight className="mx-auto h-4 w-4" aria-hidden />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-5 py-10 sm:px-6" colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-2 text-center text-zinc-500">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80">
                        <Inbox className="h-5 w-5 text-zinc-400" aria-hidden />
                      </div>
                      <p className="text-xs font-medium text-zinc-700">
                        {debouncedSearch ? 'Aramanıza uygun teslimat yok' : 'Henüz sipariş yok'}
                      </p>
                      <p className="max-w-sm text-[11px] text-zinc-500">
                        {debouncedSearch
                          ? 'Farklı bir sipariş no, müşteri veya kurye adı deneyin veya aramayı temizleyin.'
                          : 'Veritabanında teslimat bulunamadı veya API yanıtı boş.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
