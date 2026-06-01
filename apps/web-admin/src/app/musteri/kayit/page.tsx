import { CustomerRegisterClient } from './CustomerRegisterClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Kayıt ol — Point',
  description: 'Point müşteri hesabı oluşturun.',
};

export default function MusteriKayitPage() {
  return <CustomerRegisterClient />;
}
