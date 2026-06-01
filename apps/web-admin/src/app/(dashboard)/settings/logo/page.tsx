'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Upload } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet, apiPatch, staffPostMultipart } from '@/lib/api';
import { PUBLIC_BRAND_QUERY_KEY } from '@/lib/brand-public';
import { strSetting, STAFF_SETTINGS_QUERY_KEY, type StaffSettingsResponse } from '@/lib/settings-api';
import { cn } from '@/lib/cn';

export default function LogoSettingsPage() {
  const qc = useQueryClient();
  const lightFileRef = useRef<HTMLInputElement>(null);
  const darkFileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'light' | 'dark' | null>(null);

  const q = useQuery({
    queryKey: STAFF_SETTINGS_QUERY_KEY,
    queryFn: () => apiGet<StaffSettingsResponse>('/staff/settings'),
    retry: 0,
  });

  const [light, setLight] = useState('');
  const [dark, setDark] = useState('');

  useEffect(() => {
    if (!q.data?.values) return;
    const v = q.data.values;
    setLight(strSetting(v['brand.logoLightUrl'], ''));
    setDark(strSetting(v['brand.logoDarkUrl'], ''));
  }, [q.data]);

  const saveUrlsM = useMutation({
    mutationFn: () =>
      apiPatch<StaffSettingsResponse>('/staff/settings', {
        values: {
          'brand.logoLightUrl': light.trim(),
          'brand.logoDarkUrl': dark.trim(),
        },
      }),
    onSuccess: (data) => {
      void qc.setQueryData(STAFF_SETTINGS_QUERY_KEY, data);
      void qc.invalidateQueries({ queryKey: PUBLIC_BRAND_QUERY_KEY });
    },
  });

  async function uploadFile(variant: 'light' | 'dark', file: File | null | undefined) {
    if (!file?.size) return;
    setUploadTarget(variant);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await staffPostMultipart<StaffSettingsResponse>(
        `/staff/settings/logo/${encodeURIComponent(variant)}`,
        fd,
      );
      void qc.setQueryData(STAFF_SETTINGS_QUERY_KEY, data);
      void qc.invalidateQueries({ queryKey: PUBLIC_BRAND_QUERY_KEY });
    } finally {
      setUploadTarget(null);
      const ref = variant === 'light' ? lightFileRef : darkFileRef;
      if (ref.current) ref.current.value = '';
    }
  }

  if (q.isError) {
    const msg = (q.error as Error).message;
    const forbidden = msg.includes('403') || msg.toLowerCase().includes('forbidden');
    return (
      <>
        <PageHeader title="Logo" description="Dosya veya URL ile marka görselleri." />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {forbidden ? (
            <>Yalnızca sistem yöneticisi düzenleyebilir.</>
          ) : (
            <>
              {msg} <Link href="/auth/login" className="text-brand hover:underline">Giriş</Link>
            </>
          )}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Logo"
        description="PNG, JPEG, WebP veya SVG (en fazla 2 MB). Yükleme `storage/uploads` altına yazılır; ayarlarda tam URL saklanır."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Dosya ile yükle</h2>
          {q.isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" aria-hidden />
          ) : (
            <>
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-4">
                <p className="text-xs font-medium text-zinc-600">Açık tema</p>
                <input
                  ref={lightFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                  className="hidden"
                  onChange={(e) => void uploadFile('light', e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={uploadTarget !== null}
                  onClick={() => lightFileRef.current?.click()}
                  className={cn(
                    'mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50',
                  )}
                >
                  {uploadTarget === 'light' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden />
                  )}
                  Dosya seç (açık)
                </button>
                {light.trim().startsWith('http') ? (
                  <div className="relative mt-4 h-28 max-w-xs overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={light.trim()} alt="Açık tema logosu" className="h-full w-full object-contain p-2" />
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-4">
                <p className="text-xs font-medium text-zinc-600">Koyu tema</p>
                <input
                  ref={darkFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                  className="hidden"
                  onChange={(e) => void uploadFile('dark', e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={uploadTarget !== null}
                  onClick={() => darkFileRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {uploadTarget === 'dark' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden />
                  )}
                  Dosya seç (koyu)
                </button>
                {dark.trim().startsWith('http') ? (
                  <div className="relative mt-4 h-28 max-w-xs overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dark.trim()} alt="Koyu tema logosu" className="h-full w-full object-contain p-2" />
                  </div>
                ) : null}
              </div>
            </>
          )}
        </GlassCard>
        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Veya URL ile</h2>
          {q.isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" aria-hidden />
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-zinc-600">Açık tema logo URL</label>
                <input
                  value={light}
                  onChange={(e) => setLight(e.target.value)}
                  placeholder="https://…"
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600">Koyu tema logo URL</label>
                <input
                  value={dark}
                  onChange={(e) => setDark(e.target.value)}
                  placeholder="https://…"
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
              {saveUrlsM.isError ? <p className="text-sm text-red-700">{(saveUrlsM.error as Error).message}</p> : null}
              <button
                type="button"
                disabled={saveUrlsM.isPending}
                onClick={() => void saveUrlsM.mutateAsync()}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saveUrlsM.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                URL’leri kaydet
              </button>
            </>
          )}
        </GlassCard>
      </div>
    </>
  );
}
