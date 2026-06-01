'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { AuthenticatedDeliveryFlow } from '@point/delivery-wizard';
import { apiGetAuth, apiPostAuth } from '@/lib/api';
import { fetchGeoDistricts, fetchGeoNeighborhoods } from '@/lib/geography-public';
import { GlassCard } from '@/components/customer/GlassCard';

type MeResponse = {
  senderName?: string | null;
  phone: string;
};

export function CustomerNewDeliveryFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get('type');
  const initialType =
    typeParam === 'DOCUMENT' || typeParam === 'PACKAGE' ? typeParam : undefined;

  const meQuery = useQuery({
    queryKey: ['customer', 'me', 'delivery'],
    queryFn: () => apiGetAuth<MeResponse>('/customer/me'),
  });

  if (meQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  if (meQuery.isError) {
    return (
      <GlassCard className="text-sm text-red-800 dark:text-red-200">
        {(meQuery.error as Error).message}
      </GlassCard>
    );
  }

  const senderName = meQuery.data?.senderName?.trim() ?? '';

  return (
    <AuthenticatedDeliveryFlow
      initialType={initialType}
      apiGetAuth={apiGetAuth}
      apiPostAuth={apiPostAuth}
      fetchDistricts={fetchGeoDistricts}
      fetchNeighborhoods={(districtId) =>
        fetchGeoNeighborhoods(districtId).then((rows) => rows.map((n) => ({ id: n.id, name: n.name })))
      }
      onCreated={(orderNumber) => router.push(`/orders/${orderNumber}`)}
      profileGate={
        !senderName ? (
          <GlassCard className="space-y-3 text-sm text-amber-900 dark:text-amber-100">
            <p>
              Profilinizde gönderici adı (ad soyad veya şirket ünvanı) tanımlı değil. Teslimat oluşturmak için
              destek ile iletişime geçin veya hesabınızı güncelleyin.
            </p>
            <Link href="/account" className="font-semibold text-brand hover:underline">
              Hesabıma git
            </Link>
          </GlassCard>
        ) : undefined
      }
    />
  );
}
