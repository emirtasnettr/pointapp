'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiPost } from '@/lib/api';
import {
  DOC_REVIEW_STATUS_TR,
  type ApplicationDetail,
  type CourierDocReviewStatusApi,
} from '@/lib/courier-onboarding-admin';
import { cn } from '@/lib/cn';

function StatusPill({ status }: { status: CourierDocReviewStatusApi }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        status === 'APPROVED' && 'bg-emerald-100 text-emerald-800',
        status === 'REJECTED' && 'bg-red-100 text-red-800',
        status === 'PENDING' && 'bg-amber-100 text-amber-900',
      )}
    >
      {DOC_REVIEW_STATUS_TR[status]}
    </span>
  );
}

export function CourierApplicationDocuments({
  publicId,
  data,
  canReviewDocuments,
}: {
  publicId: string;
  data: ApplicationDetail;
  canReviewDocuments: boolean;
}) {
  const qc = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['staff', 'courier-application', publicId] });
    void qc.invalidateQueries({ queryKey: ['staff', 'courier-applications'] });
  };

  const approveDocM = useMutation({
    mutationFn: (requirementId: string) =>
      apiPost(
        `/staff/courier/applications/${encodeURIComponent(publicId)}/requirements/${encodeURIComponent(requirementId)}/approve`,
        {},
      ),
    onSuccess: invalidate,
  });

  const requestRevisionsM = useMutation({
    mutationFn: () =>
      apiPost(`/staff/courier/applications/${encodeURIComponent(publicId)}/request-revisions`, {}),
    onSuccess: invalidate,
  });

  const rejectDocM = useMutation({
    mutationFn: ({ requirementId, reason }: { requirementId: string; reason: string }) =>
      apiPost(
        `/staff/courier/applications/${encodeURIComponent(publicId)}/requirements/${encodeURIComponent(requirementId)}/reject`,
        { reason },
      ),
    onSuccess: () => {
      setRejectingId(null);
      setRejectReason('');
      invalidate();
    },
  });

  const dr = data.documentsReview;

  return (
    <>
      <GlassCard className="mb-4 p-4">
        <p className="text-sm font-semibold text-zinc-900">Evrak inceleme özeti</p>
        <p className="mt-1 text-xs text-zinc-500">
          Önce her alanı ayrı ayrı onaylayın veya reddedin. Tüm zorunlu alanlar onaylandığında hesabı
          onaylayabilirsiniz.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="rounded-lg bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700">
            Zorunlu: {dr.approvedCount}/{dr.totalRequired} onaylı
          </span>
          {dr.pendingCount > 0 ? (
            <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-900">
              {dr.pendingCount} bekliyor
            </span>
          ) : null}
          {dr.rejectedCount > 0 ? (
            <span className="rounded-lg bg-red-50 px-2.5 py-1 font-medium text-red-800">
              {dr.rejectedCount} reddedildi
            </span>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="mb-6 p-0">
        <h2 className="border-b border-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-900">
          Evrak ve metin alanları
        </h2>
        <ul className="divide-y divide-zinc-100">
          {data.requirements
            .filter((r) => r.active)
            .map((r) => (
              <li key={r.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-900">
                        {r.label}
                        {r.required ? <span className="text-red-500"> *</span> : null}
                      </p>
                      <StatusPill status={r.reviewStatus} />
                    </div>
                    {r.hint ? <p className="mt-1 text-xs text-zinc-500">{r.hint}</p> : null}
                  </div>
                  {canReviewDocuments && r.hasContent && r.reviewStatus !== 'APPROVED' ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => approveDocM.mutate(r.id)}
                        disabled={approveDocM.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {approveDocM.isPending && approveDocM.variables === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(r.id);
                          setRejectReason('');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reddet
                      </button>
                    </div>
                  ) : null}
                </div>

                {r.reviewStatus === 'REJECTED' && r.rejectionReason ? (
                  <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                    <strong>Red nedeni:</strong> {r.rejectionReason}
                  </p>
                ) : null}

                {r.kind === 'TEXT' ? (
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm text-zinc-800">
                    {r.textValue?.trim() || <span className="text-zinc-400">Girilmedi</span>}
                  </p>
                ) : r.fileUrl ? (
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    Dosyayı aç
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">Yüklenmedi</p>
                )}

                {rejectingId === r.id ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                    <label className="block text-xs font-medium text-zinc-700">
                      Bu alan için red nedeni (kurye yalnızca bu alanı görür)
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        placeholder="Örn. görsel bulanık / vergi no hatalı"
                      />
                    </label>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          rejectDocM.mutate({ requirementId: r.id, reason: rejectReason.trim() })
                        }
                        disabled={rejectDocM.isPending || rejectReason.trim().length < 3}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {rejectDocM.isPending ? 'Kaydediliyor…' : 'Reddi kaydet'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId(null)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600"
                      >
                        İptal
                      </button>
                    </div>
                    {rejectDocM.isError ? (
                      <p className="mt-2 text-xs text-red-600">{(rejectDocM.error as Error).message}</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
        </ul>
      </GlassCard>

      {canReviewDocuments && dr.hasRejected ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-950">
            {dr.rejectedCount} alan reddedildi. İncelemeyi bitirdikten sonra kuryenin yalnızca bu alanları
            düzeltmesi için gönderin; onaylanmış alanlar kilitli kalır.
          </p>
          <button
            type="button"
            onClick={() => requestRevisionsM.mutate()}
            disabled={requestRevisionsM.isPending}
            className="mt-3 rounded-lg bg-amber-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {requestRevisionsM.isPending ? 'Gönderiliyor…' : 'Kuryeye düzeltme için gönder'}
          </button>
          {requestRevisionsM.isError ? (
            <p className="mt-2 text-xs text-red-700">{(requestRevisionsM.error as Error).message}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
