'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Lock, X } from 'lucide-react';
import type { DeliveryVatPricing } from '../lib/delivery-vat';
import { DeliveryVatSummary } from './DeliveryVatSummary';

const DEMO_CARD_PAN = '4111 1111 1111 1111';
const DEMO_CARD_EXP = '12/28';
const DEMO_CARD_CVV = '123';
const DEMO_OTP = '123456';

type PaySimStep = 'form' | 'authorizing' | 'threeDS' | 'threeDSProcessing' | 'finalizing' | 'done';

export function CardPaymentSimulationModal({
  open,
  pricing,
  onClose,
  onPaid,
}: {
  open: boolean;
  pricing: DeliveryVatPricing | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [step, setStep] = useState<PaySimStep>('form');
  const [pan, setPan] = useState(DEMO_CARD_PAN);
  const [expiry, setExpiry] = useState(DEMO_CARD_EXP);
  const [cvv, setCvv] = useState(DEMO_CARD_CVV);
  const [otp, setOtp] = useState(DEMO_OTP);

  useEffect(() => {
    if (!open) return;
    setStep('form');
    setPan(DEMO_CARD_PAN);
    setExpiry(DEMO_CARD_EXP);
    setCvv(DEMO_CARD_CVV);
    setOtp(DEMO_OTP);
  }, [open]);

  if (!open) return null;

  const panDigits = pan.replace(/\D/g, '');
  const expOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.trim());
  const cvvOk = /^\d{3}$/.test(cvv.trim());
  const panOk = panDigits.length === 16;
  const canContinueForm = panOk && expOk && cvvOk;
  const otpOk = /^\d{6}$/.test(otp.trim());
  const dismissible = step === 'form' || step === 'threeDS';

  const stepTitle =
    step === 'form'
      ? 'Kredi / Banka Kartı'
      : step === 'authorizing'
        ? 'Banka bağlantısı'
        : step === 'threeDS' || step === 'threeDSProcessing'
          ? '3D Secure'
          : step === 'finalizing'
            ? 'Ödeme tamamlanıyor'
            : 'Ödeme sonucu';

  const stepSub =
    step === 'authorizing'
      ? 'Kartınızı veren bankaya güvenli kanaldan bağlanılıyor…'
      : step === 'threeDSProcessing'
        ? 'Doğrulama kodunuz banka tarafından kontrol ediliyor…'
        : step === 'finalizing'
          ? 'Tutar bloke ediliyor ve siparişe işleniyor…'
          : '';

  const goAuthorizing = () => {
    if (!canContinueForm) return;
    setStep('authorizing');
    setTimeout(() => setStep('threeDS'), 1300);
  };

  const goThreeDSComplete = () => {
    if (!otpOk) return;
    setStep('threeDSProcessing');
    setTimeout(() => {
      setStep('finalizing');
      setTimeout(() => {
        setStep('done');
        setTimeout(() => onPaid(), 550);
      }, 1100);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        aria-label="Kapat"
        onClick={dismissible ? onClose : undefined}
      />
      <div className="relative z-[1] max-h-[88vh] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <div className="max-h-[88vh] overflow-y-auto p-[18px] pb-[22px]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="flex-1 text-[17px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {stepTitle}
            </h3>
            <button
              type="button"
              onClick={dismissible ? onClose : undefined}
              disabled={!dismissible}
              className="rounded-lg p-1 text-zinc-500 disabled:opacity-40"
              aria-label="Kapat"
            >
              <X className="h-[22px] w-[22px]" strokeWidth={2.2} />
            </button>
          </div>
          <p className="mb-2.5 text-xs font-medium leading-snug text-zinc-600 dark:text-zinc-400">
            Demo ödeme: gerçek tahsilat yok. Aşağıdaki bilgiler otomatik doldurulur; 3D Secure adımlarını deneyebilirsiniz.
          </p>
          {pricing ? (
            <div className="mb-4">
              <DeliveryVatSummary pricing={pricing} compact />
            </div>
          ) : (
            <p className="mb-4 text-[22px] font-extrabold text-zinc-900">—</p>
          )}

          {step === 'form' ? (
            <>
              <label className="mb-1 mt-1 block text-xs font-bold text-zinc-500">Kart numarası</label>
              <input
                className="mb-1 w-full rounded-[10px] border border-zinc-200 bg-white px-3.5 py-3 text-base font-semibold text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
                placeholder="16 haneli numara"
                inputMode="numeric"
                maxLength={19}
                value={pan}
                onChange={(e) => setPan(e.target.value.replace(/[^\d\s]/g, ''))}
              />
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-500">Son kullanma</label>
                  <input
                    className="w-full rounded-[10px] border border-zinc-200 bg-white px-3.5 py-3 text-base font-semibold dark:border-zinc-600 dark:bg-zinc-900"
                    placeholder="AA/YY"
                    maxLength={5}
                    value={expiry}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                      const a = d.slice(0, 2);
                      const b = d.slice(2, 4);
                      setExpiry(b ? `${a}/${b}` : a);
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-500">CVC</label>
                  <input
                    className="w-full rounded-[10px] border border-zinc-200 bg-white px-3.5 py-3 text-base font-semibold dark:border-zinc-600 dark:bg-zinc-900"
                    placeholder="•••"
                    type="password"
                    maxLength={3}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={!canContinueForm}
                onClick={goAuthorizing}
                className="mt-[18px] w-full rounded-xl bg-[#16B24B] py-3.5 text-base font-bold text-white disabled:opacity-45"
              >
                Bankaya gönder
              </button>
            </>
          ) : null}

          {step === 'authorizing' || step === 'threeDSProcessing' || step === 'finalizing' ? (
            <div className="flex flex-col items-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#16B24B] border-t-transparent" />
              <p className="mt-3.5 text-center text-[15px] font-semibold leading-snug text-zinc-600">{stepSub}</p>
            </div>
          ) : null}

          {step === 'threeDS' ? (
            <>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#16B24B]/35 bg-[#16B24B]/10 px-3 py-2 text-[13px] font-extrabold text-[#0f7a32]">
                <Lock className="h-[18px] w-[18px]" strokeWidth={2.2} />
                Güvenli doğrulama
              </span>
              <p className="mb-3 text-sm font-medium leading-relaxed text-zinc-600">
                Bankanız ek doğrulama istiyor. Demo ortamında kod otomatik gelir; dilediğiniz 6 haneli sayıyı da
                girebilirsiniz.
              </p>
              <label className="mb-1 block text-xs font-bold text-zinc-500">SMS / uygulama doğrulama kodu</label>
              <input
                className="mb-1 w-full rounded-[10px] border border-zinc-200 px-3.5 py-3 text-base font-semibold dark:border-zinc-600 dark:bg-zinc-900"
                placeholder="6 hane"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <p className="mb-1 mt-1.5 text-xs font-semibold text-[#16B24B]">Önerilen demo kodu: {DEMO_OTP}</p>
              <button
                type="button"
                disabled={!otpOk}
                onClick={goThreeDSComplete}
                className="mt-[18px] w-full rounded-xl bg-[#16B24B] py-3.5 text-base font-bold text-white disabled:opacity-45"
              >
                Doğrula ve ödemeyi tamamla
              </button>
            </>
          ) : null}

          {step === 'done' ? (
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 className="h-12 w-12 text-[#16B24B]" strokeWidth={2.2} />
              <p className="mt-3 text-center text-[17px] font-extrabold text-zinc-900">Ödeme başarıyla tamamlandı</p>
              <p className="mt-2 text-center text-sm font-medium text-zinc-500">Siparişiniz oluşturuluyor…</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
