'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Shield } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/cn';

type RbacResponse = {
  items: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    builtIn: boolean;
    permissions: Array<{ slug: string; description: string | null }>;
  }>;
};

export default function RolesSettingsPage() {
  const q = useQuery({
    queryKey: ['staff', 'rbac', 'roles'],
    queryFn: () => apiGet<RbacResponse>('/staff/rbac/roles'),
    retry: 1,
  });

  return (
    <>
      <PageHeader
        title="Rol ve izinler"
        description="RBAC şeması (Role ↔ Permission). Personel hesabı `StaffProfile.appRole` ile de bağlanır; bu tablo API/izin kontrolü için referans."
      />
      {q.isError ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(q.error as Error).message}{' '}
          <Link href="/auth/login" className="font-medium text-brand hover:underline">
            Giriş
          </Link>
        </p>
      ) : null}
      {q.isPending ? (
        <div className="flex justify-center py-16 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : q.data?.items.length ? (
        <div className="space-y-4">
          {q.data.items.map((role) => (
            <GlassCard key={role.id} className="p-5">
              <div className="flex flex-wrap items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-zinc-900">{role.name}</h2>
                  <p className="font-mono text-xs text-zinc-500">{role.slug}</p>
                  {role.description ? <p className="mt-1 text-sm text-zinc-600">{role.description}</p> : null}
                  {role.builtIn ? (
                    <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                      built-in
                    </span>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {role.permissions.map((p) => (
                      <span
                        key={p.slug}
                        title={p.description ?? undefined}
                        className={cn(
                          'rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-800',
                          'ring-1 ring-inset ring-zinc-100',
                        )}
                      >
                        {p.slug}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-8 text-center text-sm text-zinc-500">Henüz rol tanımı yok. `db:seed` çalıştırın.</GlassCard>
      )}
    </>
  );
}
