'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet, apiPatch } from '@/lib/api';
import { strSetting, STAFF_SETTINGS_QUERY_KEY, type StaffSettingsResponse } from '@/lib/settings-api';

const SMS_PROVIDERS = [
  { value: 'mock', label: 'Mock (geliştirme)' },
  { value: 'netgsm', label: 'Netgsm' },
  { value: 'none', label: 'Kapalı' },
];

const MASK = '••••••••';

export default function SmsSettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: STAFF_SETTINGS_QUERY_KEY,
    queryFn: () => apiGet<StaffSettingsResponse>('/staff/settings'),
    retry: 0,
  });

  const [provider, setProvider] = useState('mock');
  const [header, setHeader] = useState('');
  const [apiUser, setApiUser] = useState('');
  const [apiPass, setApiPass] = useState('');

  useEffect(() => {
    if (!q.data?.values) return;
    const v = q.data.values;
    setProvider(strSetting(v['sms.provider'], 'mock').toLowerCase());
    setHeader(strSetting(v['sms.header'], ''));
    setApiUser(strSetting(v['sms.apiUser'], ''));
    setApiPass('');
  }, [q.data]);

  const saveM = useMutation({
    mutationFn: () =>
      apiPatch<StaffSettingsResponse>('/staff/settings', {
        values: {
          'sms.provider': provider,
          'sms.header': header.trim(),
          'sms.apiUser': apiUser.trim(),
          ...(apiPass.trim() ? { 'sms.apiPass': apiPass.trim() } : {}),
        },
      }),
    onSuccess: (data) => {
      void qc.setQueryData(STAFF_SETTINGS_QUERY_KEY, data);
      setApiPass('');
    },
  });

  if (q.isError) {
    const msg = (q.error as Error).message;
    const forbidden = msg.includes('403') || msg.toLowerCase().includes('forbidden');
    return (
      <>
        <PageHeader title="SMS" description="Sağlayıcı ve başlık; API şifresi maskelenir." />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {forbidden ? <>Yalnızca sistem yöneticisi.</> : <>{msg} <Link href="/auth/login" className="text-brand hover:underline">Giriş</Link></>}
        </p>
      </>
    );
  }

  const passMasked = strSetting(q.data?.values['sms.apiPass'], '') === MASK;

  return (
    <>
      <PageHeader
        title="SMS ayarları"
        description="Adapter yapılandırması `sms.*` anahtarlarında. Gerçek SMS için Netgsm bilgilerini girin; şifre yalnızca değiştirmek için doldurun."
      />
      <GlassCard className="max-w-xl space-y-4 p-5">
        {q.isPending ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-400" aria-hidden />
        ) : (
          <>
            <div>
              <label className="text-xs font-medium text-zinc-600">Sağlayıcı</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {SMS_PROVIDERS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Başlık (header)</label>
              <input
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                maxLength={40}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">API kullanıcı</label>
              <input
                value={apiUser}
                onChange={(e) => setApiUser(e.target.value)}
                maxLength={40}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">API şifre</label>
              <input
                type="password"
                value={apiPass}
                onChange={(e) => setApiPass(e.target.value)}
                autoComplete="new-password"
                placeholder={passMasked ? '•••••••• (değiştirmek için yeni girin)' : 'Boş bırakılabilir'}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-500">Kayıtlı şifre panelde gösterilmez; güncellemek için yeni değer yazın.</p>
            </div>
            {saveM.isError ? <p className="text-sm text-red-700">{(saveM.error as Error).message}</p> : null}
            <button
              type="button"
              disabled={saveM.isPending}
              onClick={() => void saveM.mutateAsync()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saveM.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Kaydet
            </button>
          </>
        )}
      </GlassCard>
    </>
  );
}
