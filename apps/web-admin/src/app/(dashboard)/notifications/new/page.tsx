'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BellPlus, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiPost } from '@/lib/api';

const CHANNELS = [
  { value: 'IN_APP', label: 'Uygulama içi' },
  { value: 'PUSH', label: 'Push' },
  { value: 'SMS', label: 'SMS' },
] as const;

type CreateRes = { id: string };

export default function NewNotificationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]['value']>('IN_APP');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dataJson, setDataJson] = useState('');

  const createM = useMutation({
    mutationFn: async () => {
      const e = email.trim().toLowerCase();
      const p = phone.replace(/\s|-/g, '').trim();
      if (!e && !p) throw new Error('E-posta veya telefon girin.');
      const t = title.trim();
      const b = body.trim();
      if (!t) throw new Error('Başlık zorunludur.');
      if (!b) throw new Error('İçerik zorunludur.');

      const bodyPayload: Record<string, unknown> = {
        channel,
        title: t,
        body: b,
      };
      if (e) bodyPayload.email = e;
      if (p) bodyPayload.phone = p;

      const raw = dataJson.trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Ek veri bir JSON nesnesi olmalı.');
          }
          bodyPayload.data = parsed as Record<string, unknown>;
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : 'Ek veri geçerli JSON olmalı.');
        }
      }

      return apiPost<CreateRes>('/staff/notifications', bodyPayload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff', 'notifications'] });
      router.push('/notifications');
    },
  });

  const err = createM.error as Error | undefined;

  return (
    <>
      <PageHeader
        title="Yeni bildirim"
        description="Hedef kullanıcıyı e-posta veya telefon ile bulun. Kayıt, veritabanına uygulama içi / push / SMS kanalıyla yazılır."
        actions={
          <Link
            href="/notifications"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand/30"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Listeye dön
          </Link>
        }
      />

      <GlassCard className="max-w-xl">
        <div className="space-y-4 text-sm">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Hedef e-posta (tercihen)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@firma.com"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Hedef telefon (e-posta yoksa)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5xx xxx xx xx"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Kanal</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as (typeof CHANNELS)[number]['value'])}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40"
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Başlık</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">İçerik</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Ek veri (JSON, isteğe bağlı)</label>
            <textarea
              value={dataJson}
              onChange={(e) => setDataJson(e.target.value)}
              rows={3}
              placeholder='{"orderNumber": 1000001}'
              className="w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs outline-none focus:border-brand/40"
            />
          </div>

          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err.message}</p>
          ) : null}

          <button
            type="button"
            disabled={createM.isPending}
            onClick={() => void createM.mutateAsync()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
          >
            {createM.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <BellPlus className="h-4 w-4" aria-hidden />
            )}
            Oluştur
          </button>
        </div>
      </GlassCard>
    </>
  );
}
