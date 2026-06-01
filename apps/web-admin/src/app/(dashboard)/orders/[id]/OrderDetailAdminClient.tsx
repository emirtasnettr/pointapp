'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  CircleDot,
  ClipboardList,
  History,
  Loader2,
  MapPin,
  Phone,
  FileText,
  RefreshCw,
  Search,
  Settings2,
  Truck,
  Upload,
  UserRoundCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import { DeliveryCustomerInvoiceUploadModal } from '@/components/admin/DeliveryCustomerInvoiceUploadModal';
import {
  apiBase,
  apiGet,
  apiPost,
  apiTimeoutSignal,
  openStaffDeliveryCustomerInvoice,
  staffAuthHeaders,
  staffParseJsonRes,
} from '@/lib/api';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import { cn } from '@/lib/cn';
import { formatTry } from '@/lib/format';

type StatusLog = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorType: string;
  actorId: string | null;
  createdAt: string;
  meta: unknown;
};

type DeliveryDetail = {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
  description: string | null;
  weightKg: string | null;
  vehicleType: string;
  pickupAddress: { label?: string; line1?: string; city?: string };
  dropoffAddress: { label?: string; line1?: string; city?: string };
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  totalPrice: string;
  commissionRate: string;
  commissionAmount: string;
  courierEarning: string;
  paymentMethod: string;
  paymentStatus: string;
  customer: { publicId: string; displayName: string };
  courier: { publicId: string; displayName: string } | null;
  createdAt: string;
  updatedAt?: string;
  statusLogs?: StatusLog[];
  customerInvoices?: Array<{
    id: string;
    invoiceNumber: string | null;
    note: string | null;
    fileName: string;
    mime: string | null;
    createdAt: string;
    orderNumbers: number[];
    deliveryCount: number;
  }>;
};

type CourierOption = {
  id: string;
  publicId: string;
  type: string;
  vehicleType: string;
  displayName: string;
};

const VEHICLE_TR: Record<string, string> = {
  MOTORCYCLE: 'Motosiklet',
  CAR: 'Otomobil',
};

const TYPE_TR: Record<string, string> = {
  DOCUMENT: 'Evrak',
  PACKAGE: 'Paket',
};

const PAYMENT_METHOD_TR: Record<string, string> = {
  CARD: 'Kart',
  WALLET: 'Cüzdan',
  INVOICE_ACCOUNT: 'Cari hesap',
};

const PAYMENT_STATUS_TR: Record<string, string> = {
  PENDING: 'Bekliyor',
  AUTHORIZED: 'Provizyon',
  CAPTURED: 'Tahsil',
  FAILED: 'Başarısız',
  REFUNDED: 'İade',
};

const ACTOR_TR: Record<string, string> = {
  staff: 'Operasyon',
  courier: 'Kurye',
  system: 'Sistem',
  customer: 'Müşteri',
};

const MANUAL_STATUS_APP_ROLES = new Set([
  'SYSTEM_ADMIN',
  'GENERAL_MANAGER',
  'OPERATIONS_MANAGER',
  'OPERATIONS_SPECIALIST',
]);

const ALL_DELIVERY_STATUSES = [
  'PENDING',
  'POOL',
  'COURIER_ASSIGNED',
  'COURIER_EN_ROUTE',
  'PACKAGE_PICKED_UP',
  'DELIVERED',
  'CANCELLED',
] as const;

function logMetaSummary(meta: unknown): string {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return '';
  const o = meta as Record<string, unknown>;
  switch (o.action) {
    case 'staff_assign':
      return typeof o.courierPublicId === 'string' ? `Atanan: ${o.courierPublicId}` : '';
    case 'staff_reassign': {
      const f = o.fromCourierPublicId;
      const t = o.toCourierPublicId;
      const fs = typeof f === 'string' ? f : '—';
      const ts = typeof t === 'string' ? t : '—';
      return `${fs} → ${ts}`;
    }
    case 'staff_unassign_to_pool':
      return 'Havuza alındı';
    case 'claim':
      return 'Havuzdan üstlenildi';
    case 'start_route':
      return 'Yola çıkıldı';
    case 'pickup':
      return 'Paket alındı';
    case 'complete':
      return 'Teslim tamamlandı';
    case 'staff_manual_status': {
      const role = typeof o.appRole === 'string' ? o.appRole : '';
      const note = typeof o.note === 'string' && o.note.trim() ? o.note.trim() : '';
      return [role ? `Rol: ${role}` : '', note].filter(Boolean).join(' · ');
    }
    default:
      return '';
  }
}

async function fetchDelivery(ref: string): Promise<DeliveryDetail> {
  const res = await fetch(`${apiBase()}/deliveries/${encodeURIComponent(ref)}`, {
    cache: 'no-store',
    headers: staffAuthHeaders(),
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<DeliveryDetail>(res);
}

function SectionTitle({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
      <Icon className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
      {children}
    </h3>
  );
}

export function OrderDetailAdminClient({ id }: { id: string }) {
  const qc = useQueryClient();
  const [courierSearch, setCourierSearch] = useState('');
  const [selectedCourierPid, setSelectedCourierPid] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [invoiceUploadOpen, setInvoiceUploadOpen] = useState(false);

  const meQuery = useQuery({
    queryKey: ['staff', 'me'],
    queryFn: () => apiGet<{ appRole: string }>('/staff/me'),
    staleTime: 120_000,
  });

  const detailQuery = useQuery({
    queryKey: ['deliveries', 'admin-detail', id],
    queryFn: () => fetchDelivery(id),
    retry: 1,
  });

  const courierOptionsQuery = useQuery({
    queryKey: ['deliveries', 'courier-options'],
    queryFn: async () => {
      const res = await fetch(`${apiBase()}/deliveries/courier-options`, {
        cache: 'no-store',
        headers: staffAuthHeaders(),
        signal: apiTimeoutSignal(),
      });
      return staffParseJsonRes<{ items: CourierOption[] }>(res);
    },
    staleTime: 60_000,
  });

  const d = detailQuery.data;

  useEffect(() => {
    if (d?.courier?.publicId) setSelectedCourierPid(d.courier.publicId);
    else if (d && !d.courier) setSelectedCourierPid('');
  }, [d?.courier?.publicId, d?.id]);

  useEffect(() => {
    if (d?.status) setStatusDraft(d.status);
  }, [d?.status, d?.id]);

  const canStaffAssignOrReassign = useMemo(() => {
    if (!d) return false;
    if (d.status === 'DELIVERED' || d.status === 'CANCELLED') return false;
    if (d.status === 'COURIER_EN_ROUTE' || d.status === 'PACKAGE_PICKED_UP') return false;
    const fresh = !d.courier && (d.status === 'POOL' || d.status === 'PENDING');
    const re = d.status === 'COURIER_ASSIGNED' && !!d.courier;
    return fresh || re;
  }, [d]);

  const canStaffUnassignToPool = d?.status === 'COURIER_ASSIGNED' && !!d.courier;

  const assignMutation = useMutation({
    mutationFn: (courierPublicId: string) =>
      apiPost<DeliveryDetail>(`/deliveries/${encodeURIComponent(id)}/assign-courier`, { courierPublicId }),
    onSuccess: (data) => {
      qc.setQueryData(['deliveries', 'admin-detail', id], data);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: () => apiPost<DeliveryDetail>(`/deliveries/${encodeURIComponent(id)}/unassign-courier`),
    onSuccess: (data) => {
      qc.setQueryData(['deliveries', 'admin-detail', id], data);
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: () =>
      apiPost<DeliveryDetail>(`/deliveries/${encodeURIComponent(id)}/set-status`, {
        status: statusDraft,
        note: statusNote.trim() || undefined,
      }),
    onSuccess: (data) => {
      qc.setQueryData(['deliveries', 'admin-detail', id], data);
      setStatusNote('');
    },
  });

  const filteredCouriers = useMemo(() => {
    const items = courierOptionsQuery.data?.items ?? [];
    const q = courierSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.publicId.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.vehicleType.toLowerCase().includes(q),
    );
  }, [courierOptionsQuery.data?.items, courierSearch]);

  const logs = [...(d?.statusLogs ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  if (detailQuery.isPending) {
    return (
      <div className="flex min-h-[32vh] flex-col items-center justify-center gap-2 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden />
        <p className="text-xs">Yükleniyor…</p>
      </div>
    );
  }

  if (detailQuery.isError || !d) {
    return (
      <div className="space-y-3">
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-xs text-red-800">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{(detailQuery.error as Error)?.message ?? 'Sipariş bulunamadı.'}</span>
        </p>
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Siparişlere dön
        </Link>
      </div>
    );
  }

  const canManualStatus =
    meQuery.data?.appRole != null && MANUAL_STATUS_APP_ROLES.has(meQuery.data.appRole);

  const busy = assignMutation.isPending || unassignMutation.isPending || setStatusMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Liste
        </Link>
        <button
          type="button"
          onClick={() => void detailQuery.refetch()}
          disabled={detailQuery.isFetching}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 hover:border-zinc-300 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', detailQuery.isFetching && 'animate-spin')} aria-hidden />
          Yenile
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,min(280px,100%)]">
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200/90 bg-white">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">#{d.orderNumber}</h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700">
              <CircleDot className="h-3 w-3 text-brand" aria-hidden />
              {deliveryStatusLabel(d.status)}
            </span>
            <span className="w-full text-xs text-zinc-500 sm:w-auto sm:pl-2">
              {TYPE_TR[d.type] ?? d.type} · {VEHICLE_TR[d.vehicleType] ?? d.vehicleType} ·{' '}
              {new Date(d.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            <p className="w-full text-xs text-zinc-600">
              Müşteri <span className="font-medium text-zinc-800">{d.customer.displayName}</span>
              {d.courier ? (
                <>
                  {' · '}
                  Kurye <span className="font-medium text-zinc-800">{d.courier.displayName}</span>
                </>
              ) : (
                <span className="text-zinc-400"> · Kurye yok</span>
              )}
            </p>
          </div>

          <div className="px-4 py-3">
            <SectionTitle icon={MapPin}>Adresler</SectionTitle>
            <div className="grid gap-3 text-xs sm:grid-cols-2 sm:gap-6">
              <div>
                <p className="text-[10px] font-medium uppercase text-zinc-400">Alış</p>
                <p className="mt-0.5 font-medium text-zinc-800">{d.pickupAddress?.label ?? '—'}</p>
                <p className="text-zinc-600">{d.pickupAddress?.line1}</p>
                <p className="text-zinc-500">{d.pickupAddress?.city}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase text-zinc-400">Teslim</p>
                <p className="mt-0.5 font-medium text-zinc-800">{d.dropoffAddress?.label ?? '—'}</p>
                <p className="text-zinc-600">{d.dropoffAddress?.line1}</p>
                <p className="text-zinc-500">{d.dropoffAddress?.city}</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3">
            <SectionTitle icon={Building2}>Kişiler</SectionTitle>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <span className="text-zinc-400">Gönderen · </span>
                <span className="font-medium text-zinc-800">{d.senderName}</span>
                <a href={`tel:${d.senderPhone.replace(/\s/g, '')}`} className="ml-1 inline-flex items-center gap-0.5 text-brand hover:underline">
                  <Phone className="h-3 w-3" aria-hidden />
                  {d.senderPhone}
                </a>
              </div>
              <div>
                <span className="text-zinc-400">Alıcı · </span>
                <span className="font-medium text-zinc-800">{d.recipientName}</span>
                <a href={`tel:${d.recipientPhone.replace(/\s/g, '')}`} className="ml-1 inline-flex items-center gap-0.5 text-brand hover:underline">
                  <Phone className="h-3 w-3" aria-hidden />
                  {d.recipientPhone}
                </a>
              </div>
            </div>
          </div>

          <div className="px-4 py-3">
            <SectionTitle icon={Wallet}>Ödeme</SectionTitle>
            <p className="text-sm font-medium tabular-nums text-zinc-900">{formatTry(d.totalPrice)}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {PAYMENT_METHOD_TR[d.paymentMethod] ?? d.paymentMethod} · {PAYMENT_STATUS_TR[d.paymentStatus] ?? d.paymentStatus}
              {' · '}
              Komisyon {formatTry(d.commissionAmount)} ({d.commissionRate}) · Kurye {formatTry(d.courierEarning)} (KDV hariç)
            </p>
          </div>

          {d.type === 'PACKAGE' || d.description ? (
            <div className="px-4 py-3">
              <SectionTitle icon={ClipboardList}>
                {d.type === 'PACKAGE' ? 'Paket içeriği' : 'Açıklama'}
              </SectionTitle>
              {d.type === 'PACKAGE' ? (
                <p className="text-xs text-zinc-500">
                  Tür: {TYPE_TR[d.type] ?? d.type}
                  {d.weightKg ? ` · ${d.weightKg} kg` : ''}
                </p>
              ) : null}
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                {d.type === 'PACKAGE'
                  ? d.description?.trim() || 'Belirtilmemiş'
                  : d.description}
              </p>
            </div>
          ) : null}

          {d.status === 'DELIVERED' ? (
            <div className="border-t border-zinc-100 px-4 py-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <SectionTitle icon={FileText}>Müşteri faturaları</SectionTitle>
                <button
                  type="button"
                  onClick={() => setInvoiceUploadOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 hover:border-brand/30 hover:text-brand"
                >
                  <Upload className="h-3 w-3" aria-hidden />
                  Fatura yükle
                </button>
              </div>
              {(d.customerInvoices?.length ?? 0) > 0 ? (
                <ul className="space-y-2">
                  {d.customerInvoices!.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-100 bg-zinc-50/80 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-zinc-800">
                          {inv.invoiceNumber || inv.fileName}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {new Date(inv.createdAt).toLocaleString('tr-TR')}
                          {inv.deliveryCount > 1
                            ? ` · ${inv.deliveryCount} sipariş (#${inv.orderNumbers.join(', #')})`
                            : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void openStaffDeliveryCustomerInvoice(inv.id)}
                        className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-brand ring-1 ring-brand/20 hover:bg-brand/5"
                      >
                        Görüntüle
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-400">Henüz fatura yüklenmedi.</p>
              )}
            </div>
          ) : null}

          <div className="px-4 py-3">
            <SectionTitle icon={History}>Durum geçmişi</SectionTitle>
            {logs.length ? (
              <ul className="space-y-1.5">
                {logs.map((l) => {
                  const metaLine = logMetaSummary(l.meta);
                  return (
                    <li key={l.id} className="border-l-2 border-zinc-200 pl-2 text-xs">
                      <span className="font-medium text-zinc-800">
                        {l.fromStatus ? `${deliveryStatusLabel(l.fromStatus)} → ` : ''}
                        {deliveryStatusLabel(l.toStatus)}
                      </span>
                      <span className="text-zinc-400"> · </span>
                      <span className="text-zinc-500">{ACTOR_TR[l.actorType] ?? l.actorType}</span>
                      <span className="text-zinc-400"> · </span>
                      <span className="tabular-nums text-zinc-400">
                        {new Date(l.createdAt).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {metaLine ? <span className="mt-0.5 block text-zinc-500">{metaLine}</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-zinc-400">Log yok.</p>
            )}
          </div>
        </div>

        <aside className="flex h-fit flex-col gap-3 rounded-lg border border-zinc-200/90 bg-white p-3">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <Truck className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
            Kurye
          </h3>

          {d.courier ? (
            <p className="text-xs">
              <span className="font-medium text-zinc-900">{d.courier.displayName}</span>
              <span className="ml-1 font-mono text-[10px] text-zinc-400">{d.courier.publicId}</span>
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Atanmadı.</p>
          )}

          {!canStaffAssignOrReassign && !canStaffUnassignToPool ? (
            <p className="text-[11px] leading-snug text-amber-800/90">Bu aşamada atama yapılamaz.</p>
          ) : null}

          {canStaffAssignOrReassign ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  type="search"
                  value={courierSearch}
                  onChange={(e) => setCourierSearch(e.target.value)}
                  placeholder="Ara…"
                  className="w-full rounded-md border border-zinc-200 py-1.5 pl-7 pr-2 text-xs outline-none focus:border-brand/40"
                />
              </div>
              <div className="max-h-32 overflow-y-auto rounded-md border border-zinc-100">
                {courierOptionsQuery.isPending ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  </div>
                ) : courierOptionsQuery.isError ? (
                  <p className="p-2 text-[11px] text-red-700">{(courierOptionsQuery.error as Error).message}</p>
                ) : filteredCouriers.length ? (
                  <ul className="divide-y divide-zinc-50">
                    {filteredCouriers.map((c) => {
                      const sel = selectedCourierPid === c.publicId;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedCourierPid(c.publicId)}
                            className={cn(
                              'w-full px-2 py-1.5 text-left text-xs transition',
                              sel ? 'bg-brand/10 font-medium text-emerald-950' : 'hover:bg-zinc-50',
                            )}
                          >
                            <span className="block truncate">{c.displayName}</span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {c.publicId} · {VEHICLE_TR[c.vehicleType] ?? c.vehicleType}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="p-2 text-center text-[11px] text-zinc-400">Sonuç yok</p>
                )}
              </div>
              <button
                type="button"
                disabled={busy || !selectedCourierPid}
                onClick={() => assignMutation.mutate(selectedCourierPid)}
                className="flex w-full items-center justify-center gap-1 rounded-md bg-brand py-2 text-xs font-medium text-white hover:bg-brand/90 disabled:opacity-50"
              >
                {assignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserRoundCheck className="h-3.5 w-3.5" />}
                {d.courier ? 'Değiştir' : 'Ata'}
              </button>
            </div>
          ) : null}

          {canStaffUnassignToPool ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (typeof window !== 'undefined' && !window.confirm('Havuza alınsın mı?')) return;
                unassignMutation.mutate();
              }}
              className="w-full rounded-md border border-zinc-200 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {unassignMutation.isPending ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : 'Havuza al'}
            </button>
          ) : null}

          {(assignMutation.isError || unassignMutation.isError) && (
            <p className="text-[11px] leading-snug text-red-700">
              {((assignMutation.error ?? unassignMutation.error) as Error).message}
            </p>
          )}

          {canManualStatus ? (
            <div className="border-t border-zinc-100 pt-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <Settings2 className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                Manuel durum
              </h3>
              <p className="mb-2 text-[10px] leading-snug text-zinc-500">
                Sistem yöneticisi, genel müdür veya operasyon rolleri teslimat durumunu doğrudan güncelleyebilir.
                Havuz / beklemede / iptal seçildiğinde kurye ataması kaldırılır.
              </p>
              <label className="mb-1 block text-[10px] font-medium uppercase text-zinc-400">Yeni durum</label>
              <select
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                className="mb-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-brand/40"
              >
                {ALL_DELIVERY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {deliveryStatusLabel(s)}
                  </option>
                ))}
              </select>
              <label className="mb-1 block text-[10px] font-medium uppercase text-zinc-400">
                Not (isteğe bağlı, iptal açıklaması için kullanılabilir)
              </label>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={2}
                placeholder="Kısa açıklama…"
                className="mb-2 w-full resize-none rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-brand/40"
              />
              <button
                type="button"
                disabled={busy || statusDraft === d.status}
                onClick={() => {
                  if (typeof window !== 'undefined' && !window.confirm('Teslimat durumu bu değere güncellensin mi?')) return;
                  setStatusMutation.mutate();
                }}
                className="flex w-full items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
              >
                {setStatusMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Durumu güncelle
              </button>
              {setStatusMutation.isError ? (
                <p className="mt-1 text-[11px] leading-snug text-red-700">{(setStatusMutation.error as Error).message}</p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      {invoiceUploadOpen && d ? (
        <DeliveryCustomerInvoiceUploadModal
          deliveryIds={[d.id]}
          orderNumbers={[d.orderNumber]}
          onClose={() => setInvoiceUploadOpen(false)}
          onUploaded={() => {
            void detailQuery.refetch();
          }}
        />
      ) : null}
    </div>
  );
}
