'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { apiBase, apiTimeoutSignal, staffAuthHeaders, staffParseJsonRes } from '@/lib/api';
import { formatTry } from '@/lib/format';
import { cn } from '@/lib/cn';

type ListResponse = {
  items: Array<{
    id: string;
    publicId: string;
    type: string;
    displayName: string;
    companyName: string | null;
    userStatus: string;
    email: string | null;
    phone: string;
    walletBalance: string;
    invoiceAccountEnabled: boolean;
    deliveryCount: number;
    createdAt: string;
  }>;
  total: number;
  skip: number;
  take: number;
};

const TYPE_TR: Record<string, string> = {
  INDIVIDUAL: 'Bireysel',
  CORPORATE: 'Kurumsal',
  SOLE_PROPRIETOR: 'Şahıs işletmesi',
};

const USER_STATUS_TR: Record<string, string> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
  SUSPENDED: 'Askıda',
  PENDING_APPROVAL: 'Onay bekliyor',
  REJECTED: 'Reddedildi',
};

async function fetchCustomers(q: string): Promise<ListResponse> {
  const params = new URLSearchParams();
  params.set('take', '100');
  if (q.trim()) params.set('q', q.trim());
  const res = await fetch(`${apiBase()}/staff/customers?${params.toString()}`, {
    cache: 'no-store',
    headers: staffAuthHeaders(),
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<ListResponse>(res);
}

function UserStatusPill({ status }: { status: string }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600',
      )}
    >
      {USER_STATUS_TR[status] ?? status}
    </span>
  );
}

export default function CustomersPage() {
  const [q, setQ] = useState('');
  const [committedQ, setCommittedQ] = useState('');

  const query = useQuery({
    queryKey: ['staff', 'customers', committedQ],
    queryFn: () => fetchCustomers(committedQ),
    retry: 1,
  });

  const rows = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Müşteri Yönetimi"
        description={`Kayıtlı müşteriler (${total}). Kod, şirket adı, vergi no, e-posta, isim veya telefon ile arayın.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90"
            >
              Yeni müşteri
            </Link>
            <button
              type="button"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand/30 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-brand', query.isFetching && 'animate-spin')} aria-hidden />
              Yenile
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setCommittedQ(q);
            }}
            placeholder="Ara…"
            className="w-full rounded-lg border border-zinc-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand/40"
          />
        </div>
        <button
          type="button"
          onClick={() => setCommittedQ(q)}
          className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand/90"
        >
          Ara
        </button>
      </div>

      {query.isError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {(query.error as Error).message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200/90 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50/90 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2.5 pl-4">Kod</th>
                <th className="px-3 py-2.5">Ad</th>
                <th className="px-3 py-2.5">Tip</th>
                <th className="px-3 py-2.5">Hesap</th>
                <th className="px-3 py-2.5">Telefon</th>
                <th className="px-3 py-2.5">Bakiye</th>
                <th className="px-3 py-2.5">Fatura</th>
                <th className="px-3 py-2.5">Teslimat</th>
                <th className="w-px px-3 py-2.5 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {query.isPending ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" aria-hidden />
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/80">
                    <td className="px-3 py-2 pl-4">
                      <Link
                        href={`/customers/${encodeURIComponent(c.publicId)}`}
                        className="font-mono font-medium text-brand hover:underline"
                      >
                        {c.publicId}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-zinc-900">{c.displayName}</span>
                      {c.email ? <span className="mt-0.5 block truncate text-[10px] text-zinc-400">{c.email}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{TYPE_TR[c.type] ?? c.type}</td>
                    <td className="px-3 py-2">
                      <UserStatusPill status={c.userStatus} />
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-zinc-600">{c.phone}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-800">{formatTry(c.walletBalance)}</td>
                    <td className="px-3 py-2 text-zinc-600">{c.invoiceAccountEnabled ? 'Açık' : 'Kapalı'}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-600">{c.deliveryCount}</td>
                    <td className="px-3 py-2 pr-4 text-right">
                      <Link
                        href={`/customers/${encodeURIComponent(c.publicId)}`}
                        className="inline-flex rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-brand"
                        aria-label="Detay"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Müşteri bulunamadı.
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
