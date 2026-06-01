'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { GlassCard } from '@/components/admin/GlassCard';
import { MapErrorBoundary } from '@/components/admin/MapErrorBoundary';
import type { CourierMapPoint, DropoffDensityPoint } from '@/types/dropoff-density';
import { apiBase, apiTimeoutSignal, staffAuthHeaders, staffParseJsonRes } from '@/lib/api';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import { formatTry } from '@/lib/format';

const EMPTY_MAP_POINTS: DropoffDensityPoint[] = [];
const EMPTY_COURIER_POINTS: CourierMapPoint[] = [];

const RegionalDensityMap = dynamic(() => import('@/components/admin/RegionalDensityMap'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
      Harita yükleniyor…
    </div>
  ),
});

type Dashboard = {
  byStatus: { status: string; count: number }[];
  today: { deliveryCount: number; gross: string; commission: string };
  onlineCourierCount: number;
  activeCourierCount: number;
  dropoffPoints: DropoffDensityPoint[];
  courierMapPoints: CourierMapPoint[];
  recentDeliveries: Array<{
    id: string;
    orderNumber: number;
    status: string;
    totalPrice: string;
    createdAt: string;
    customer: { publicId: string; displayName: string };
    courier: { publicId: string; displayName: string } | null;
  }>;
};

async function fetchDashboard(): Promise<Dashboard> {
  const res = await fetch(`${apiBase()}/stats/dashboard`, {
    cache: 'no-store',
    headers: staffAuthHeaders(),
    signal: apiTimeoutSignal(),
  });
  return staffParseJsonRes<Dashboard>(res);
}

export default function DashboardPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: fetchDashboard,
    retry: 1,
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Operasyon özeti — veriler canlı API’den gelir (PostgreSQL + seed)."
      />
      {isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(error as Error).message.includes('Oturum gerekli') ? (
            <>{(error as Error).message}</>
          ) : (
            <>
              API hatası: {(error as Error).message}. Bağlantı için{' '}
              <code className="text-xs">NEXT_PUBLIC_API_URL</code> (örn. <code className="text-xs">http://localhost:5001/v1</code>) ve{' '}
              <code className="text-xs">npm run dev:api</code> kontrol edin. Yetkisiz (401) ise{' '}
              <Link href="/auth/login" className="font-medium text-brand hover:underline">
                yönetim girişi
              </Link>{' '}
              yapın.
            </>
          )}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bugün teslimat"
          value={isPending ? '…' : String(data?.today?.deliveryCount ?? 0)}
          hint="UTC takvim günü"
        />
        <StatCard
          label="Çevrim içi kurye"
          value={isPending ? '…' : String(data?.onlineCourierCount ?? 0)}
          hint="Havuz için müsait (onaylı hesap)"
        />
        <StatCard
          label="Brüt ciro"
          value={isPending ? '…' : data?.today ? formatTry(data.today.gross) : '—'}
          hint="Bugün (UTC)"
        />
        <StatCard
          label="Komisyon geliri"
          value={isPending ? '…' : data?.today ? formatTry(data.today.commission) : '—'}
          hint="Bugün (UTC)"
        />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-900">Canlı harita</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Kuryede aktif paketlerin teslim noktaları ve bu kuryelerin son bildirilen konumu. İşaretçiye tıklayıp siparişe gidebilirsiniz.
          </p>
          <div className="relative mt-4 h-[min(22rem,45vh)] min-h-[260px] overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-100">
            {isPending ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">Harita verisi yükleniyor…</div>
            ) : (
              <MapErrorBoundary
                fallback={
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-zinc-600">
                    <p>Harita yüklenemedi.</p>
                    <p className="text-xs text-zinc-500">Konsolu kontrol edin veya sayfayı yenileyin.</p>
                  </div>
                }
              >
                <RegionalDensityMap
                  packages={data?.dropoffPoints ?? EMPTY_MAP_POINTS}
                  couriers={data?.courierMapPoints ?? EMPTY_COURIER_POINTS}
                />
              </MapErrorBoundary>
            )}
          </div>
        </GlassCard>
        <GlassCard>
          <h2 className="text-sm font-semibold text-zinc-900">Durum dağılımı</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-600">
            {isPending ? (
              <li>Yükleniyor…</li>
            ) : data ? (
              (data.byStatus ?? []).map((r) => (
                <li key={r.status} className="flex justify-between gap-2">
                  <span>{deliveryStatusLabel(r.status)}</span>
                  <span className="font-medium text-zinc-900">{r.count}</span>
                </li>
              ))
            ) : (
              <li>Veri yok</li>
            )}
          </ul>
        </GlassCard>
      </div>
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Son siparişler</h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/90 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Müşteri</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {isPending ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={4}>
                    Yükleniyor…
                  </td>
                </tr>
              ) : data?.recentDeliveries?.length ? (
                data.recentDeliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link className="font-medium text-brand hover:underline" href={`/orders/${d.orderNumber}`}>
                        #{d.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{d.customer.displayName}</td>
                    <td className="px-4 py-3">{deliveryStatusLabel(d.status)}</td>
                    <td className="px-4 py-3">{formatTry(d.totalPrice)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={4}>
                    Kayıt yok
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
