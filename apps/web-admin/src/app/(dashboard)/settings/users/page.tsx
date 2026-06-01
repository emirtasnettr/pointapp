'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Loader2, Search, UserPlus, Users } from 'lucide-react';
import { SettingsTabs } from '@/components/admin/SettingsTabs';
import { PageHeader } from '@/components/admin/PageHeader';
import { apiGet } from '@/lib/api';
import { getStaffUser } from '@/lib/admin-session';
import { staffRoleLabel } from '@/lib/staff-role';
import { cn } from '@/lib/cn';

type ListResponse = {
  items: Array<{
    userId: string;
    email: string | null;
    phone: string;
    firstName: string | null;
    lastName: string | null;
    appRole: string;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
  }>;
  total: number;
};

const STATUS_TR: Record<string, string> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
};

function StatusPill({ status }: { status: string }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600',
      )}
    >
      {STATUS_TR[status] ?? status}
    </span>
  );
}

export default function StaffUsersPage() {
  const me = getStaffUser();
  const isAdmin = me?.appRole === 'SYSTEM_ADMIN';
  const [q, setQ] = useState('');
  const [committedQ, setCommittedQ] = useState('');

  const query = useQuery({
    queryKey: ['staff', 'users', committedQ],
    queryFn: () => {
      const params = new URLSearchParams({ take: '100' });
      if (committedQ.trim()) params.set('q', committedQ.trim());
      return apiGet<ListResponse>(`/staff/users?${params.toString()}`);
    },
    enabled: isAdmin,
    retry: 1,
  });

  if (!isAdmin) {
    return (
      <>
        <SettingsTabs />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Personel hesabı yönetimi yalnızca sistem yöneticisi rolüne açıktır.
        </p>
      </>
    );
  }

  return (
    <>
      <SettingsTabs />
      <PageHeader
        title="Kullanıcı yönetimi"
        description="Operasyon, muhasebe ve yönetim personeli hesaplarını oluşturun; pasife alın veya şifre sıfırlayın."
        actions={
          <Link
            href="/settings/users/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-soft hover:bg-brand/90"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Yeni personel
          </Link>
        }
      />

      <form
        className="mb-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setCommittedQ(q);
        }}
      >
        <label className="min-w-[200px] flex-1 text-xs font-medium text-zinc-600">
          Ara (ad, e-posta, telefon)
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 py-2 pl-9 pr-3 text-sm"
              placeholder="Örn. ahmet veya @point…"
            />
          </div>
        </label>
        <button
          type="submit"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:border-brand/30"
        >
          Ara
        </button>
      </form>

      {query.isError ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(query.error as Error).message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-soft">
        {query.isPending ? (
          <div className="flex justify-center py-16 text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : query.data?.items.length ? (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/90 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Personel</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">İletişim</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Son giriş</th>
                <th className="w-8 px-2 py-3" aria-hidden />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {query.data.items.map((row) => {
                const name = [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || '—';
                return (
                  <tr key={row.userId} className="hover:bg-brand/[0.03]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{name}</p>
                      <p className="text-[11px] text-zinc-500">
                        Kayıt: {new Date(row.createdAt).toLocaleDateString('tr-TR')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-700">{staffRoleLabel(row.appRole)}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      <p>{row.email ?? '—'}</p>
                      <p className="text-zinc-500">{row.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-zinc-500">
                      {row.lastLoginAt
                        ? new Date(row.lastLoginAt).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        href={`/settings/users/${encodeURIComponent(row.userId)}`}
                        className="inline-flex rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label="Detay"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-zinc-500">
            <Users className="h-10 w-10 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-700">Kayıt bulunamadı</p>
          </div>
        )}
      </div>
    </>
  );
}
