'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { apiBase, apiTimeoutSignal, staffAuthHeaders, staffParseJsonRes } from '@/lib/api';
import { cn } from '@/lib/cn';

type ListResponse = {
  items: Array<{
    id: string;
    channel: string;
    title: string;
    body: string;
    readAt: string | null;
    createdAt: string;
    user: { email: string | null; phone: string; displayName: string };
  }>;
  total: number;
  skip: number;
  take: number;
};

const CHANNEL_TR: Record<string, string> = {
  PUSH: 'Push',
  SMS: 'SMS',
  IN_APP: 'Uygulama içi',
};

async function fetchNotifications(q: string): Promise<ListResponse> {
  const params = new URLSearchParams();
  params.set('take', '100');
  if (q.trim()) params.set('q', q.trim());
  const res = await fetch(`${apiBase()}/staff/notifications?${params.toString()}`, {
    cache: 'no-store',
    headers: staffAuthHeaders(),
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<ListResponse>(res);
}

export default function NotificationsPage() {
  const [q, setQ] = useState('');
  const [committedQ, setCommittedQ] = useState('');

  const query = useQuery({
    queryKey: ['staff', 'notifications', committedQ],
    queryFn: () => fetchNotifications(committedQ),
    retry: 1,
  });

  const rows = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Bildirim Yönetimi"
        description={`Kayıtlı bildirimler (${total}). Başlık, metin, e-posta, telefon veya kullanıcı adına göre arayın.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/notifications/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90"
            >
              Yeni bildirim
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
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50/90 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2.5 pl-4">Tarih</th>
                <th className="px-3 py-2.5">Kanal</th>
                <th className="px-3 py-2.5">Başlık</th>
                <th className="px-3 py-2.5">İçerik</th>
                <th className="px-3 py-2.5">Kullanıcı</th>
                <th className="px-3 py-2.5 pr-4">Okundu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {query.isPending ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" aria-hidden />
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((n) => (
                  <tr key={n.id} className="align-top hover:bg-zinc-50/80">
                    <td className="whitespace-nowrap px-3 py-2 pl-4 text-[11px] text-zinc-500">
                      {new Date(n.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{CHANNEL_TR[n.channel] ?? n.channel}</td>
                    <td className="max-w-[200px] px-3 py-2 font-medium text-zinc-900">
                      <span className="line-clamp-2">{n.title}</span>
                    </td>
                    <td className="max-w-[280px] px-3 py-2 text-zinc-600">
                      <span className="line-clamp-3 whitespace-pre-wrap">{n.body}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-zinc-800">{n.user.displayName}</span>
                      <span className="mt-0.5 block font-mono text-[10px] text-zinc-400">{n.user.phone}</span>
                      {n.user.email ? (
                        <span className="mt-0.5 block truncate text-[10px] text-zinc-400">{n.user.email}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 pr-4">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                          n.readAt ? 'bg-zinc-100 text-zinc-600' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80',
                        )}
                      >
                        {n.readAt ? 'Evet' : 'Hayır'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Bildirim bulunamadı.
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
