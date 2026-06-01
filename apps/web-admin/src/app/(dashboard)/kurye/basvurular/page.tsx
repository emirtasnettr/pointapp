'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Loader2, Search } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet } from '@/lib/api';
import {
  COURIER_TYPE_TR,
  ONBOARDING_STATUS_TR,
  VEHICLE_TYPE_TR,
  type ApplicationsListResponse,
  type CourierOnboardingStatusApi,
} from '@/lib/courier-onboarding-admin';
import { cn } from '@/lib/cn';

const STATUS_FILTERS: Array<{ value: '' | CourierOnboardingStatusApi; label: string }> = [
  { value: '', label: 'Tümü' },
  { value: 'PENDING_REVIEW', label: 'İncelemede' },
  { value: 'DOCUMENTS_REQUIRED', label: 'Evrak bekliyor' },
  { value: 'REJECTED', label: 'Reddedildi' },
  { value: 'APPROVED', label: 'Onaylı' },
];

export default function CourierApplicationsPage() {
  const [status, setStatus] = useState<'' | CourierOnboardingStatusApi>('PENDING_REVIEW');
  const [q, setQ] = useState('');
  const [committedQ, setCommittedQ] = useState('');

  const listQ = useQuery({
    queryKey: ['staff', 'courier-applications', status, committedQ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('take', '100');
      if (status) params.set('status', status);
      if (committedQ.trim()) params.set('q', committedQ.trim());
      return apiGet<ApplicationsListResponse>(`/staff/courier/applications?${params.toString()}`);
    },
  });

  return (
    <>
      <PageHeader
        title="Kurye başvuruları"
        description="Kayıt olan kuryelerin evraklarını inceleyin; onaylayın veya red nedeni yazarak reddedin."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                status === f.value ? 'bg-brand text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form
          className="flex max-w-md flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setCommittedQ(q);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Kod, ad, e-posta, telefon…"
              className="w-full rounded-xl border border-zinc-200 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button type="submit" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
            Ara
          </button>
        </form>
      </div>

      <GlassCard className="overflow-hidden p-0">
        {listQ.isLoading ? (
          <p className="flex items-center gap-2 p-6 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
          </p>
        ) : listQ.isError ? (
          <p className="p-6 text-sm text-red-600">{(listQ.error as Error).message}</p>
        ) : !listQ.data?.items.length ? (
          <p className="p-6 text-sm text-zinc-500">Kayıt bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Kurye</th>
                  <th className="px-4 py-3">Kimlik / iletişim</th>
                  <th className="px-4 py-3">Araç</th>
                  <th className="px-4 py-3">Tür</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Gönderim</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {listQ.data.items.map((row) => (
                  <tr key={row.publicId} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{row.displayName}</p>
                      <p className="font-mono text-xs text-brand">{row.publicId}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      <p className="font-mono">T.C. {row.tcKimlikNo ?? '—'}</p>
                      <p className="mt-0.5">{row.phone}</p>
                      <p className="mt-0.5 break-all">{row.email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      <p>{VEHICLE_TYPE_TR[row.vehicleType] ?? row.vehicleType}</p>
                      <p className="mt-0.5 font-mono">{row.plate ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{COURIER_TYPE_TR[row.type]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                          row.onboardingStatus === 'PENDING_REVIEW' && 'bg-amber-100 text-amber-900',
                          row.onboardingStatus === 'APPROVED' && 'bg-emerald-100 text-emerald-800',
                          row.onboardingStatus === 'REJECTED' && 'bg-red-100 text-red-800',
                          row.onboardingStatus === 'DOCUMENTS_REQUIRED' && 'bg-zinc-100 text-zinc-700',
                        )}
                      >
                        {ONBOARDING_STATUS_TR[row.onboardingStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {row.submittedForReviewAt
                        ? new Date(row.submittedForReviewAt).toLocaleString('tr-TR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/kurye/basvurular/${encodeURIComponent(row.publicId)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        İncele
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </>
  );
}
