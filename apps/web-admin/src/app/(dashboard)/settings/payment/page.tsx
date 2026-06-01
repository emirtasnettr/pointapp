'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet, apiPatch } from '@/lib/api';
import { strSetting, STAFF_SETTINGS_QUERY_KEY, type StaffSettingsResponse } from '@/lib/settings-api';

const PAY_PROVIDERS = [
  { value: 'none', label: 'Kapalı' },
  { value: 'mock', label: 'Mock' },
  { value: 'paytr', label: 'PayTR' },
  { value: 'iyzico', label: 'İyzico' },
];

const MASK = '••••••••';

export default function PaymentSettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: STAFF_SETTINGS_QUERY_KEY,
    queryFn: () => apiGet<StaffSettingsResponse>('/staff/settings'),
    retry: 0,
  });

  const [provider, setProvider] = useState('none');
  const [paytrId, setPaytrId] = useState('');
  const [paytrKey, setPaytrKey] = useState('');
  const [iyziKey, setIyziKey] = useState('');
  const [iyziSecret, setIyziSecret] = useState('');

  useEffect(() => {
    if (!q.data?.values) return;
    const v = q.data.values;
    setProvider(strSetting(v['payment.provider'], 'none').toLowerCase());
    setPaytrId(strSetting(v['payment.paytrMerchantId'], ''));
    setPaytrKey('');
    const ik = strSetting(v['payment.iyziApiKey'], '');
    setIyziKey(ik === MASK ? '' : ik);
    setIyziSecret('');
  }, [q.data]);

  const saveM = useMutation({
    mutationFn: () =>
      apiPatch<StaffSettingsResponse>('/staff/settings', {
        values: {
          'payment.provider': provider,
          'payment.paytrMerchantId': paytrId.trim(),
          ...(paytrKey.trim() ? { 'payment.paytrMerchantKey': paytrKey.trim() } : {}),
          ...(iyziKey.trim() ? { 'payment.iyziApiKey': iyziKey.trim() } : {}),
          ...(iyziSecret.trim() ? { 'payment.iyziSecretKey': iyziSecret.trim() } : {}),
        },
      }),
    onSuccess: (data) => {
      void qc.setQueryData(STAFF_SETTINGS_QUERY_KEY, data);
      setPaytrKey('');
      setIyziSecret('');
    },
  });

  if (q.isError) {
    const msg = (q.error as Error).message;
    const forbidden = msg.includes('403') || msg.toLowerCase().includes('forbidden');
    return (
      <>
        <PageHeader title="Ödeme" description="Sağlayıcı ve mağaza bilgileri." />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {forbidden ? (
            <>Yalnızca sistem yöneticisi.</>
          ) : (
            <>
              {msg} <Link href="/auth/login" className="text-brand hover:underline">Giriş</Link>
            </>
          )}
        </p>
      </>
    );
  }

  const keyMasked = strSetting(q.data?.values['payment.paytrMerchantKey'], '') === MASK;
  const iyziSecMasked = strSetting(q.data?.values['payment.iyziSecretKey'], '') === MASK;
  const iyziKeyMasked = strSetting(q.data?.values['payment.iyziApiKey'], '') === MASK;

  return (
    <>
      <PageHeader
        title="Ödeme ayarları"
        description="`payment.*` anahtarları. Gizli alanlar maskelenir; güncellemek için yeni değer girin."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-5">
          <h3 className="text-sm font-semibold text-zinc-900">Genel</h3>
          {q.isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" aria-hidden />
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-zinc-600">Sağlayıcı</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  {PAY_PROVIDERS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600">PayTR merchant id</label>
                <input
                  value={paytrId}
                  onChange={(e) => setPaytrId(e.target.value)}
                  maxLength={200}
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600">PayTR merchant key</label>
                <input
                  type="password"
                  value={paytrKey}
                  onChange={(e) => setPaytrKey(e.target.value)}
                  placeholder={keyMasked ? `${MASK} (yeni key)` : 'Opsiyonel'}
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm"
                />
              </div>
            </>
          )}
        </GlassCard>
        <GlassCard className="space-y-4 p-5">
          <h3 className="text-sm font-semibold text-zinc-900">İyzico</h3>
          {q.isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" aria-hidden />
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-zinc-600">API key</label>
                <input
                  value={iyziKey}
                  onChange={(e) => setIyziKey(e.target.value)}
                  maxLength={200}
                  placeholder={iyziKeyMasked ? `${MASK} (yeni API key)` : ''}
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600">Secret key</label>
                <input
                  type="password"
                  value={iyziSecret}
                  onChange={(e) => setIyziSecret(e.target.value)}
                  placeholder={iyziSecMasked ? `${MASK} (yeni secret)` : 'Opsiyonel'}
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm"
                />
              </div>
            </>
          )}
        </GlassCard>
      </div>
      {!q.isPending ? (
        <div className="mt-6">
          {saveM.isError ? <p className="mb-2 text-sm text-red-700">{(saveM.error as Error).message}</p> : null}
          <button
            type="button"
            disabled={saveM.isPending}
            onClick={() => void saveM.mutateAsync()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saveM.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            Kaydet
          </button>
        </div>
      ) : null}
    </>
  );
}
