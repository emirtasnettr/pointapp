import { CustomerLoginClient } from './CustomerLoginClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Giriş yap — Point',
  description: 'Müşteri paneline giriş yapın.',
};

export default function MusteriGirisPage() {
  return <CustomerLoginClient />;
}
