'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiBase, apiTimeoutSignal, staffAuthHeaders, staffParseJsonRes } from '@/lib/api';
import { cn } from '@/lib/cn';

type Actor = {
  id: string;
  email: string | null;
  phone: string;
  displayName: string;
} | null;

type AuditItem = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ip: string | null;
  userAgent: string | null;
  diff: unknown;
  createdAt: string;
  actor: Actor;
};

type ListResponse = {
  total: number;
  skip: number;
  take: number;
  items: AuditItem[];
};

const PAGE_SIZE = 50;

function fmtShort(iso: string) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function fetchAuditLogs(params: {
  skip: number;
  q: string;
  resource: string;
  from: string;
  to: string;
}): Promise<ListResponse> {
  const sp = new URLSearchParams();
  sp.set('skip', String(params.skip));
  sp.set('take', String(PAGE_SIZE));
  if (params.q.trim()) sp.set('q', params.q.trim());
  if (params.resource.trim()) sp.set('resource', params.resource.trim());
  if (params.from.trim()) sp.set('from', params.from.trim());
  if (params.to.trim()) sp.set('to', params.to.trim());
  const res = await fetch(`${apiBase()}/staff/audit-logs?${sp.toString()}`, {
    cache: 'no-store',
    headers: staffAuthHeaders(),
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<ListResponse>(res);
}

function DiffBlock({ diff }: { diff: unknown }) {
  if (diff == null) return <span className="text-zinc-400">—</span>;
  try {
    const s = JSON.stringify(diff, null, 2);
    return (
      <details className="text-xs">
        <summary className="cursor-pointer font-medium text-brand hover:underline">diff</summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-zinc-900/90 p-3 font-mono text-zinc-100">{s}</pre>
      </details>
    );
  } catch {
    return <span className="text-zinc-500">(okunamadı)</span>;
  }
}

export default function AuditLogsPage() {
  const [q, setQ] = useState('');
  const [resource, setResource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [committed, setCommitted] = useState({ q: '', resource: '', from: '', to: '' });
  const [page, setPage] = useState(0);

  const skip = page * PAGE_SIZE;

  const queryKey = ['staff', 'audit-logs', skip, committed] as const;

  const listQ = useQuery({
    queryKey,
    queryFn: () =>
      fetchAuditLogs({
        skip,
        q: committed.q,
        resource: committed.resource,
        from: committed.from,
        to: committed.to,
      }),
    retry: 1,
  });

  const totalPages = useMemo(() => {
    const t = listQ.data?.total ?? 0;
    return Math.max(1, Math.ceil(t / PAGE_SIZE));
  }, [listQ.data?.total]);

  const applyFilters = () => {
    setCommitted({
      q,
      resource,
      from,
      to,
    });
    setPage(0);
  };

  return (
    <>
      <PageHeader
        title="Denetim kayıtları"
        description="Sistem ve personel işlemleri: aksiyon, kaynak, IP, kullanıcı aracısı ve diff. Tarih alanları UTC günüdür (YYYY-MM-DD)."
      />

      <GlassCard className="mb-6 space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600">
            Metin ara
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="action, resource, resourceId…"
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="flex w-40 flex-col gap-1 text-xs font-medium text-zinc-600">
            Kaynak (tam)
            <input
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              placeholder="database"
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Başlangıç
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Bitiş
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Search className="h-4 w-4" aria-hidden />
            Ara
          </button>
          <button
            type="button"
            onClick={() => {
              setQ('');
              setResource('');
              setFrom('');
              setTo('');
              setCommitted({ q: '', resource: '', from: '', to: '' });
              setPage(0);
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Sıfırla
          </button>
          <button
            type="button"
            onClick={() => void listQ.refetch()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw className={cn('h-4 w-4', listQ.isFetching && 'animate-spin')} aria-hidden />
            Yenile
          </button>
        </div>
        {listQ.data ? (
          <p className="text-xs text-zinc-500">
            Toplam <span className="font-medium text-zinc-800">{listQ.data.total}</span> kayıt · Sayfa{' '}
            <span className="font-medium text-zinc-800">
              {page + 1} / {totalPages}
            </span>
          </p>
        ) : null}
      </GlassCard>

      {listQ.isError ? (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(listQ.error as Error).message.includes('Oturum gerekli') ? (
            <>{(listQ.error as Error).message}</>
          ) : (
            <>
              {(listQ.error as Error).message}.{' '}
              <Link href="/auth/login" className="font-medium text-brand hover:underline">
                Giriş
              </Link>
            </>
          )}
        </p>
      ) : null}

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2.5">Zaman</th>
                <th className="px-4 py-2.5">Aktör</th>
                <th className="px-4 py-2.5">Aksiyon</th>
                <th className="px-4 py-2.5">Kaynak</th>
                <th className="px-4 py-2.5">Kaynak ID</th>
                <th className="px-4 py-2.5">IP</th>
                <th className="px-4 py-2.5">User-Agent</th>
                <th className="px-4 py-2.5">Diff</th>
              </tr>
            </thead>
            <tbody>
              {listQ.isPending ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-zinc-500">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-zinc-400" aria-hidden />
                  </td>
                </tr>
              ) : listQ.data?.items.length ? (
                listQ.data.items.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100/90 align-top last:border-0 hover:bg-zinc-50/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-600">{fmtShort(row.createdAt)}</td>
                    <td className="max-w-[180px] px-4 py-2.5">
                      {row.actor ? (
                        <>
                          <p className="truncate font-medium text-zinc-900" title={row.actor.displayName}>
                            {row.actor.displayName}
                          </p>
                          <p className="truncate text-xs text-zinc-500" title={row.actor.email ?? row.actor.phone}>
                            {row.actor.email ?? row.actor.phone}
                          </p>
                        </>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-800">{row.action}</td>
                    <td className="px-4 py-2.5 text-zinc-700">{row.resource}</td>
                    <td className="max-w-[120px] truncate px-4 py-2.5 font-mono text-xs text-zinc-600" title={row.resourceId ?? ''}>
                      {row.resourceId ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-zinc-600">{row.ip ?? '—'}</td>
                    <td
                      className="max-w-[160px] truncate px-4 py-2.5 text-xs text-zinc-500"
                      title={row.userAgent ?? ''}
                    >
                      {row.userAgent ?? '—'}
                    </td>
                    <td className="max-w-[220px] px-4 py-2.5">
                      <DiffBlock diff={row.diff} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {listQ.data && listQ.data.total > PAGE_SIZE ? (
          <div className="flex items-center justify-between border-t border-zinc-200/80 px-4 py-3">
            <button
              type="button"
              disabled={page <= 0 || listQ.isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Önceki
            </button>
            <span className="text-xs text-zinc-500">
              {skip + 1}–{Math.min(skip + PAGE_SIZE, listQ.data.total)} / {listQ.data.total}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages || listQ.isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Sonraki
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </GlassCard>
    </>
  );
}
