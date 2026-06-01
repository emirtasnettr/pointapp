'use client';

import { CustomerAddressesManager } from '@/components/customer/CustomerAddressesManager';

export default function AddressesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Adreslerim</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Sık kullandığınız adresleri kaydedin; yeni teslimat oluştururken seçebilirsiniz.
        </p>
      </div>
      <CustomerAddressesManager />
    </div>
  );
}
