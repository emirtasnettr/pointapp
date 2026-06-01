import type { Metadata } from 'next';
import { LandingPage } from '@/components/marketing/LandingPage';

export const metadata: Metadata = {
  title: 'Point — Şehir içi anlık teslimat',
  description:
    'Point ile evrak ve paket gönderilerinizi aynı gün teslim ettirin. Müşteri paneli, kurye ağı ve operasyon yönetimi tek platformda.',
  openGraph: {
    title: 'Point — Şehir içi anlık teslimat',
    description: 'Hızlı kurye, şeffaf fiyat, canlı takip.',
  },
};

export default function Home() {
  return <LandingPage />;
}
