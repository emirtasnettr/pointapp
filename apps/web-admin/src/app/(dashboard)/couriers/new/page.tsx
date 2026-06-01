'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { apiPost } from '@/lib/api';

type CreateBody = {
  email: string;
  password: string;
  phone: string;
  firstName: string;
  lastName: string;
  type: 'INDIVIDUAL' | 'MERCHANT';
  vehicleType: 'MOTORCYCLE' | 'CAR';
};

export default function NewCourierPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<CreateBody>({
    email: '',
    password: '',
    phone: '',
    firstName: '',
    lastName: '',
    type: 'INDIVIDUAL',
    vehicleType: 'MOTORCYCLE',
  });

  const create = useMutation({
    mutationFn: (body: CreateBody) => apiPost<{ publicId: string }>('/staff/couriers', body),
    onSuccess: (data) => {
      router.push(`/couriers/${encodeURIComponent(data.publicId)}`);
    },
    onError: (e) => {
      setErr((e as Error).message);
    },
  });

  return (
    <>
      <PageHeader
        title="Yeni kurye"
        description="Kullanıcı oluşturulur, BK/EK kodu ve cüzdan otomatik açılır."
        actions={
          <Link href="/couriers" className="text-xs font-medium text-zinc-500 hover:text-brand">
            ← Liste
          </Link>
        }
      />

      <form
        className="max-w-lg space-y-4 rounded-lg border border-zinc-200 bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(null);
          create.mutate(form);
        }}
      >
        {err ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
            E-posta
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
            Şifre (en az 8 karakter)
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
            Telefon
            <input
              required
              type="tel"
              placeholder="+905551234567"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm font-mono"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Ad
            <input
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Soyad
            <input
              required
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Kurye tipi
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CreateBody['type'] }))}
              className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="INDIVIDUAL">Bireysel (BK kodu)</option>
              <option value="MERCHANT">Esnaf (EK kodu)</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Araç
            <select
              value={form.vehicleType}
              onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value as CreateBody['vehicleType'] }))}
              className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="MOTORCYCLE">Motosiklet</option>
              <option value="CAR">Otomobil</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Oluştur
          </button>
          <Link
            href="/couriers"
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Vazgeç
          </Link>
        </div>
      </form>
    </>
  );
}
