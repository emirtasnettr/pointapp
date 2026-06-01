'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/cn';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import { formatTry } from '@/lib/format';

type ReportsOverview = {
  range: { from: string; to: string };
  summary: {
    deliveryCount: number;
    deliveredCount: number;
    cancelledCount: number;
    openCount: number;
    gross: string;
    commission: string;
    avgOrderGross: string;
    completionRatePercent: number | null;
  };
  byStatus: { status: string; count: number }[];
  byPaymentStatus: { paymentStatus: string; count: number }[];
  daily: { day: string; count: number; gross: string; commission: string }[];
  topCouriers: { publicId: string; displayName: string; deliveredCount: number }[];
};

const PAYMENT_TR: Record<string, string> = {
  PENDING: 'Beklemede',
  AUTHORIZED: 'Yetkili',
  CAPTURED: 'Tahsil',
  FAILED: 'Başarısız',
  REFUNDED: 'İade',
};

function ymdUtc(iso: string) {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function fmtRange(fromIso: string, toIso: string) {
  try {
    const o = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: undefined });
    return `${o.format(new Date(fromIso))} — ${o.format(new Date(toIso))}`;
  } catch {
    return `${fromIso} — ${toIso}`;
  }
}

export default function ReportsPage() {
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [committedFrom, setCommittedFrom] = useState('');
  const [committedTo, setCommittedTo] = useState('');

  const queryKey = ['staff', 'reports', 'overview', committedFrom, committedTo] as const;

  const q = useQuery({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams();
      if (committedFrom.trim()) p.set('from', committedFrom.trim());
      if (committedTo.trim()) p.set('to', committedTo.trim());
      const qs = p.toString();
      return apiGet<ReportsOverview>(`/staff/reports/overview${qs ? `?${qs}` : ''}`);
    },
    retry: 1,
  });

  const dailyMaxGross = useMemo(() => {
    const nums = q.data?.daily.map((d) => Number(d.gross)) ?? [];
    return Math.max(1, ...nums, 0);
  }, [q.data?.daily]);

  return (
    <>
      <PageHeader
        title="Raporlama"
        description="Teslimat ve gelir özeti; tarih aralığı UTC takvim gününe göre (YYYY-MM-DD). Boş gönderirseniz son 14 gün kullanılır."
      />

      <GlassCard className="mb-6 space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Başlangıç (UTC)
            <input
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Bitiş (UTC)
            <input
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setCommittedFrom(fromInput.trim());
              setCommittedTo(toInput.trim());
            }}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Uygula
          </button>
          <button
            type="button"
            onClick={() => {
              setFromInput('');
              setToInput('');
              setCommittedFrom('');
              setCommittedTo('');
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Son 14 gün (varsayılan)
          </button>
          <button
            type="button"
            onClick={() => void q.refetch()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} aria-hidden />
            Yenile
          </button>
        </div>
        {q.data ? (
          <p className="text-xs text-zinc-500">
            Seçili dönem: <span className="font-medium text-zinc-700">{fmtRange(q.data.range.from, q.data.range.to)}</span>{' '}
            ({ymdUtc(q.data.range.from)} → {ymdUtc(q.data.range.to)})
          </p>
        ) : null}
      </GlassCard>

      {q.isError ? (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(q.error as Error).message.includes('Oturum gerekli') ? (
            <>{(q.error as Error).message}</>
          ) : (
            <>
              {(q.error as Error).message}.{' '}
              <Link href="/auth/login" className="font-medium text-brand hover:underline">
                Giriş
              </Link>
            </>
          )}
        </p>
      ) : null}

      {q.isPending ? (
        <div className="flex justify-center py-16 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" aria-hidden />
        </div>
      ) : q.data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <GlassCard className="p-4">
              <p className="text-xs text-zinc-500">Sipariş (dönem)</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">{q.data.summary.deliveryCount}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Teslim: {q.data.summary.deliveredCount} · İptal: {q.data.summary.cancelledCount} · Açık:{' '}
                {q.data.summary.openCount}
              </p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-xs text-zinc-500">Brüt ciro</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatTry(q.data.summary.gross)}</p>
              <p className="mt-2 text-xs text-zinc-500">Ort. sipariş: {formatTry(q.data.summary.avgOrderGross)}</p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-xs text-zinc-500">Komisyon</p>
              <p className="mt-1 text-2xl font-semibold text-brand">{formatTry(q.data.summary.commission)}</p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-xs text-zinc-500">Tamamlama (teslim / (teslim + iptal))</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {q.data.summary.completionRatePercent != null
                  ? `${q.data.summary.completionRatePercent}%`
                  : '—'}
              </p>
              <p className="mt-2 text-xs text-zinc-500">Biten sipariş yoksa oran hesaplanmaz.</p>
            </GlassCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand" aria-hidden />
                <h2 className="text-sm font-semibold text-zinc-900">Günlük brüt ciro</h2>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Her satır UTC günü; bar göreli ölçek.</p>
              <ul className="mt-4 space-y-2">
                {q.data.daily.length ? (
                  q.data.daily.map((d) => {
                    const w = Math.round((100 * Number(d.gross)) / dailyMaxGross);
                    return (
                      <li key={d.day} className="text-sm">
                        <div className="flex justify-between gap-2 text-xs text-zinc-600">
                          <span className="font-mono">{d.day}</span>
                          <span>
                            {formatTry(d.gross)} · {d.count} sip.
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-brand/80"
                            style={{ width: `${Math.max(4, w)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="text-sm text-zinc-500">Bu aralıkta kayıt yok.</li>
                )}
              </ul>
            </GlassCard>

            <GlassCard className="p-4">
              <h2 className="text-sm font-semibold text-zinc-900">En çok teslim eden kuryeler</h2>
              <p className="mt-1 text-xs text-zinc-500">Dönem içi DELIVERED sayısı (ilk 10).</p>
              <ol className="mt-4 space-y-2">
                {q.data.topCouriers.length ? (
                  q.data.topCouriers.map((c, i) => (
                    <li key={c.publicId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-zinc-500">{i + 1}.</span>
                      <Link href={`/couriers/${c.publicId}`} className="flex-1 truncate font-medium text-brand hover:underline">
                        {c.displayName}
                      </Link>
                      <span className="tabular-nums text-zinc-700">{c.deliveredCount}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-zinc-500">Veri yok.</li>
                )}
              </ol>
            </GlassCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard className="overflow-hidden p-0">
              <div className="border-b border-zinc-200/80 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-900">Teslimat durumu</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {q.data.byStatus.map((r) => (
                    <tr key={r.status} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-2 text-zinc-700">{deliveryStatusLabel(r.status)}</td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums text-zinc-900">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
            <GlassCard className="overflow-hidden p-0">
              <div className="border-b border-zinc-200/80 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-900">Ödeme durumu</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {q.data.byPaymentStatus.map((r) => (
                    <tr key={r.paymentStatus} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-2 text-zinc-700">
                        {PAYMENT_TR[r.paymentStatus] ?? r.paymentStatus}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums text-zinc-900">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </div>
        </div>
      ) : null}
    </>
  );
}
