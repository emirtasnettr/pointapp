'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CourierApplicationDocuments } from '@/components/admin/CourierApplicationDocuments';
import { CourierApplicationProfile } from '@/components/admin/CourierApplicationProfile';
import { PageHeader } from '@/components/admin/PageHeader';
import { apiGet, apiPost } from '@/lib/api';
import {
  COURIER_TYPE_TR,
  ONBOARDING_STATUS_TR,
  type ApplicationDetail,
} from '@/lib/courier-onboarding-admin';

export default function CourierApplicationDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);
  const qc = useQueryClient();
  const [approveAccountError, setApproveAccountError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['staff', 'courier-application', publicId],
    queryFn: () => apiGet<ApplicationDetail>(`/staff/courier/applications/${encodeURIComponent(publicId)}`),
  });

  const approveAccountM = useMutation({
    mutationFn: () => apiPost(`/staff/courier/applications/${encodeURIComponent(publicId)}/approve`, {}),
    onSuccess: () => {
      setApproveAccountError(null);
      void qc.invalidateQueries({ queryKey: ['staff', 'courier-application', publicId] });
      void qc.invalidateQueries({ queryKey: ['staff', 'courier-applications'] });
    },
    onError: (e) => setApproveAccountError((e as Error).message),
  });

  const data = q.data;
  const canReviewDocuments = data?.account.onboardingStatus === 'PENDING_REVIEW';

  return (
    <>
      <Link
        href="/kurye/basvurular"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Başvurular
      </Link>

      {q.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </p>
      ) : q.isError || !data ? (
        <p className="text-sm text-red-600">{(q.error as Error)?.message ?? 'Başvuru bulunamadı'}</p>
      ) : (
        <>
          <PageHeader
            title={data.displayName}
            description={`${data.publicId} · ${COURIER_TYPE_TR[data.profile.type]} · ${ONBOARDING_STATUS_TR[data.account.onboardingStatus]}`}
          />

          <CourierApplicationProfile data={data} />

          <CourierApplicationDocuments
            publicId={publicId}
            data={data}
            canReviewDocuments={canReviewDocuments}
          />

          {canReviewDocuments ? (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => approveAccountM.mutate()}
                disabled={approveAccountM.isPending || !data.documentsReview.allRequiredApproved}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {approveAccountM.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Hesabı onayla ve teslimata aç
              </button>
              {!data.documentsReview.allRequiredApproved ? (
                <p className="text-xs text-zinc-500">
                  Bu düğme, zorunlu tüm evrak ve metin alanları tek tek onaylandığında aktif olur.
                </p>
              ) : null}
              {approveAccountError ? (
                <p className="text-sm text-red-600">{approveAccountError}</p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
