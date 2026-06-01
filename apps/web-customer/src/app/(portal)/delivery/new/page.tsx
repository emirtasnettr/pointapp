'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CustomerNewDeliveryFlow } from '@/components/customer/CustomerNewDeliveryFlow';

export default function NewDeliveryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
        </div>
      }
    >
      <CustomerNewDeliveryFlow />
    </Suspense>
  );
}
