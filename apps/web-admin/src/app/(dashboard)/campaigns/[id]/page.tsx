'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet, apiPatch } from '@/lib/api';
import { cn } from '@/lib/cn';

type CampaignDetail = {
  id: string;
  name: string;
  code: string | null;
  config: unknown;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxUsesPerCustomer: number | null;
  createdAt: string;
  updatedAt: string;
  windowExpired: boolean;
  totalRedemptions: number;
  uniqueCustomerCount: number;
};

type RedemptionRow = {
  deliveryId: string;
  orderNumber: number;
  usedAt: string;
  customer: { id: string; publicId: string; email: string | null; phone: string };
};

type DetailResponse = {
  campaign: CampaignDetail;
  redemptions: RedemptionRow[];
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const t = d.getTime() - d.getTimezoneOffset() * 60_000;
  return new Date(t).toISOString().slice(0, 16);
}

function fromDatetimeLocal(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  return new Date(t).toISOString();
}

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function CampaignEditPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();
  const qc = useQueryClient();

  const detailQ = useQuery({
    queryKey: ['staff', 'campaigns', id],
    queryFn: () => apiGet<DetailResponse>(`/staff/campaigns/${encodeURIComponent(id)}`),
    enabled: !!id,
    retry: 1,
  });

  const c = detailQ.data?.campaign;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);
  const [startsLocal, setStartsLocal] = useState('');
  const [endsLocal, setEndsLocal] = useState('');
  const [maxUses, setMaxUses] = useState('');

  useEffect(() => {
    if (!c) return;
    setName(c.name);
    setCode(c.code ?? '');
    setActive(c.active);
    setStartsLocal(toDatetimeLocalValue(c.startsAt));
    setEndsLocal(toDatetimeLocalValue(c.endsAt));
    setMaxUses(c.maxUsesPerCustomer == null ? '' : String(c.maxUsesPerCustomer));
  }, [c]);

  const patchM = useMutation({
    mutationFn: async () => {
      const cur = qc.getQueryData<DetailResponse>(['staff', 'campaigns', id])?.campaign;
      if (!cur) throw new Error('Kampanya yüklenemedi');

      const body: Record<string, unknown> = {};
      if (name.trim() !== cur.name) body.name = name.trim();

      const nextCode = code.trim() ? code.trim().toUpperCase() : null;
      if (nextCode !== (cur.code ?? null)) body.code = nextCode;

      if (active !== cur.active) body.active = active;

      const nextStarts = startsLocal.trim() ? fromDatetimeLocal(startsLocal) : null;
      if (nextStarts !== (cur.startsAt ?? null)) body.startsAt = nextStarts;

      const nextEnds = endsLocal.trim() ? fromDatetimeLocal(endsLocal) : null;
      if (nextEnds !== (cur.endsAt ?? null)) body.endsAt = nextEnds;

      const nextMax = maxUses.trim() === '' ? null : Number(maxUses.trim());
      if (nextMax !== cur.maxUsesPerCustomer) {
        if (nextMax !== null && (Number.isNaN(nextMax) || nextMax < 1)) {
          throw new Error('Müşteri limiti en az 1 olmalı veya boş bırakın (sınırsız).');
        }
        body.maxUsesPerCustomer = nextMax;
      }

      if (Object.keys(body).length === 0) {
        return qc.getQueryData<DetailResponse>(['staff', 'campaigns', id]) as DetailResponse;
      }

      return apiPatch<DetailResponse>(`/staff/campaigns/${encodeURIComponent(id)}`, body);
    },
    onSuccess: (data) => {
      void qc.setQueryData(['staff', 'campaigns', id], data);
      void qc.invalidateQueries({ queryKey: ['staff', 'campaigns'] });
    },
  });

  const err = (detailQ.error ?? patchM.error) as Error | undefined;
  const windowExpired = c?.windowExpired ?? false;

  const canEditEnds = useMemo(() => !windowExpired, [windowExpired]);

  if (!id) {
    return <p className="text-sm text-red-700">Geçersiz kampanya.</p>;
  }

  return (
    <>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => router.push('/campaigns')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Kampanya listesi
        </button>
      </div>

      <PageHeader
        title={c?.name ?? 'Kampanya'}
        description="Bitiş tarihi geçmiş kampanyalarda bitiş uzatılamaz. Kullanım sayısı teslimat kayıtlarından gelir."
      />

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err.message}</p>
      ) : null}

      {windowExpired ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Bu kampanyanın süresi dolmuş. Bitiş tarihini uzatamazsınız; diğer alanları (ör. pasif yapma) güncelleyebilirsiniz.
        </p>
      ) : null}

      {detailQ.isPending ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
        </div>
      ) : !c ? (
        <p className="text-sm text-zinc-600">Kampanya bulunamadı.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard>
            <h2 className="text-sm font-semibold text-zinc-900">Düzenle</h2>
            <div className="mt-4 grid gap-4">
              <label className="text-xs">
                <span className="font-medium text-zinc-600">Ad</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
                />
              </label>
              <label className="text-xs">
                <span className="font-medium text-zinc-600">Kod (büyük harf önerilir)</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none focus:border-brand/40"
                  placeholder="Örn. YAZ2026"
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                <span className="font-medium text-zinc-600">Aktif</span>
              </label>
              <label className="text-xs">
                <span className="font-medium text-zinc-600">Başlangıç (boş = sınırsız)</span>
                <input
                  type="datetime-local"
                  value={startsLocal}
                  onChange={(e) => setStartsLocal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
                />
              </label>
              <label className="text-xs">
                <span className="font-medium text-zinc-600">Bitiş (boş = sınırsız)</span>
                <input
                  type="datetime-local"
                  value={endsLocal}
                  onChange={(e) => setEndsLocal(e.target.value)}
                  disabled={!canEditEnds}
                  className={cn(
                    'mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40',
                    !canEditEnds && 'cursor-not-allowed opacity-50',
                  )}
                />
              </label>
              <label className="text-xs">
                <span className="font-medium text-zinc-600">Müşteri başına max kullanım (boş = sınırsız)</span>
                <input
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  placeholder="Örn. 2"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
                />
              </label>
              <button
                type="button"
                disabled={patchM.isPending}
                onClick={() => {
                  void patchM.mutateAsync().catch(() => {});
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
              >
                {patchM.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                Kaydet
              </button>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-sm font-semibold text-zinc-900">Özet</h2>
            <dl className="mt-4 space-y-2 text-sm text-zinc-700">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Toplam kullanım</dt>
                <dd className="font-mono font-semibold text-zinc-900">{c.totalRedemptions}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Farklı müşteri</dt>
                <dd className="font-mono font-semibold text-zinc-900">{c.uniqueCustomerCount}</dd>
              </div>
            </dl>
          </GlassCard>

          <GlassCard className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900">Kullanımlar (teslimat)</h2>
            {detailQ.data!.redemptions.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Henüz bu kampanyayla oluşturulmuş teslimat yok.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-zinc-200 text-xs font-semibold uppercase text-zinc-500">
                    <tr>
                      <th className="py-2 pr-4">Sipariş no</th>
                      <th className="py-2 pr-4">Müşteri</th>
                      <th className="py-2 pr-4">E-posta</th>
                      <th className="py-2 pr-4">Telefon</th>
                      <th className="py-2">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {detailQ.data!.redemptions.map((r) => (
                      <tr key={r.deliveryId}>
                        <td className="py-2 pr-4 font-mono text-xs">
                          <Link
                            href={`/orders/${r.orderNumber}`}
                            className="font-semibold text-brand hover:underline"
                          >
                            {r.orderNumber}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs">{r.customer.publicId}</td>
                        <td className="py-2 pr-4 text-xs">{r.customer.email ?? '—'}</td>
                        <td className="py-2 pr-4 text-xs">{r.customer.phone}</td>
                        <td className="py-2 text-xs text-zinc-600">{fmtDate(r.usedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </>
  );
}
