'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { GuestDeliveryFlow } from '@point/delivery-wizard';
import { normalizeTrPhone } from '@/lib/guest-delivery-form';
import {
  createGuestDelivery,
  fetchFullDeliveryQuote,
  fetchGeoDistricts,
  fetchGeoNeighborhoods,
} from '@/lib/geography-public';
import { customerLoginPath } from '@/lib/marketing-links';

function MarketingGuestDeliveryFlowInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPickupDistrictId = searchParams?.get('pickupDistrictId')?.trim() || undefined;
  const initialDropoffDistrictId = searchParams?.get('dropoffDistrictId')?.trim() || undefined;
  const typeParam = searchParams?.get('type');
  const initialType =
    typeParam === 'DOCUMENT' || typeParam === 'PACKAGE' ? typeParam : undefined;

  return (
    <GuestDeliveryFlow
      initialType={initialType}
      initialPickupDistrictId={initialPickupDistrictId}
      initialDropoffDistrictId={initialDropoffDistrictId}
      fetchDistricts={fetchGeoDistricts}
      fetchNeighborhoods={(districtId) =>
        fetchGeoNeighborhoods(districtId).then((rows) => rows.map((n) => ({ id: n.id, name: n.name })))
      }
      fetchQuote={fetchFullDeliveryQuote}
      createDelivery={createGuestDelivery}
      normalizePhone={normalizeTrPhone}
      onCreated={(orderNumber) => router.push(`/gonderi-takibi?order=${orderNumber}`)}
      loginBanner={
        <p className="mb-4 rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          Zaten üye misiniz?{' '}
          <Link href={customerLoginPath('/delivery/new')} className="font-semibold text-brand hover:underline">
            Müşteri girişi
          </Link>
        </p>
      }
    />
  );
}

export function MarketingGuestDeliveryFlow() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-500">Yükleniyor…</div>
      }
    >
      <MarketingGuestDeliveryFlowInner />
    </Suspense>
  );
}
