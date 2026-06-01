'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { HtmlEditor } from '@/components/admin/HtmlEditor';
import { apiGet, apiPatch } from '@/lib/api';
import {
  LEGAL_PAGE_SLUGS,
  LEGAL_PAGE_TITLES,
  STAFF_LEGAL_QUERY_KEY,
  type LegalPageSlug,
  type LegalPagesResponse,
} from '@/lib/legal-pages';
import { cn } from '@/lib/cn';

export default function LegalSettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: STAFF_LEGAL_QUERY_KEY,
    queryFn: () => apiGet<LegalPagesResponse>('/staff/legal-pages'),
    retry: 0,
  });

  const [active, setActive] = useState<LegalPageSlug>('service-agreement');
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!q.data?.pages.length) return;
    const page = q.data.pages.find((p) => p.slug === active);
    if (page) setHtml(page.html);
  }, [q.data, active]);

  const saveM = useMutation({
    mutationFn: () => apiPatch<LegalPagesResponse>(`/staff/legal-pages/${active}`, { html }),
    onSuccess: (data) => {
      void qc.setQueryData(STAFF_LEGAL_QUERY_KEY, data);
      const page = data.pages.find((p) => p.slug === active);
      if (page) setHtml(page.html);
    },
  });

  if (q.isError) {
    const msg = (q.error as Error).message;
    const forbidden = msg.includes('403') || msg.toLowerCase().includes('forbidden');
    return (
      <>
        <PageHeader
          title="Yasal metinler"
          description="Müşteri uygulamasındaki sözleşme ve bilgilendirme sayfaları — yalnızca sistem yöneticisi."
        />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {forbidden ? (
            <>Bu sayfayı yalnızca sistem yöneticisi düzenleyebilir.</>
          ) : (
            <>
              {msg}{' '}
              <Link href="/auth/login" className="font-medium text-brand hover:underline">
                Giriş
              </Link>
            </>
          )}
        </p>
      </>
    );
  }

  const activePage = q.data?.pages.find((p) => p.slug === active);

  return (
    <>
      <PageHeader
        title="Yasal metinler"
        description="Hizmet sözleşmeleri, KVKK, gizlilik, teslimat ve kurumsal metinler müşteri uygulamasında listelenir. HTML editör ile düzenleyin."
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <GlassCard className="max-h-[min(70vh,640px)] overflow-y-auto p-2">
          <nav className="flex flex-col gap-0.5">
            {LEGAL_PAGE_SLUGS.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => {
                  setActive(slug);
                  const p = q.data?.pages.find((x) => x.slug === slug);
                  setHtml(p?.html ?? '');
                }}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition',
                  active === slug ? 'bg-brand/15 text-brand' : 'text-zinc-600 hover:bg-zinc-50',
                )}
              >
                {LEGAL_PAGE_TITLES[slug]}
              </button>
            ))}
          </nav>
        </GlassCard>

        <GlassCard className="p-4">
          {q.isPending ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">{LEGAL_PAGE_TITLES[active]}</h2>
                  {activePage?.updatedAt ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Son kayıt: {new Date(activePage.updatedAt).toLocaleString('tr-TR')}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={saveM.isPending}
                  onClick={() => void saveM.mutateAsync()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
                >
                  {saveM.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Save className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Kaydet
                </button>
              </div>

              {saveM.isError ? (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {(saveM.error as Error).message}
                </p>
              ) : null}

              <HtmlEditor value={html} onChange={setHtml} disabled={saveM.isPending} />
            </>
          )}
        </GlassCard>
      </div>
    </>
  );
}
