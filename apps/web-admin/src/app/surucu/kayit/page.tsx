import { CourierRegisterClient } from './CourierRegisterClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sürücü kayıt — Point',
  description: 'Point kurye ağına katılın ve teslimat yapmaya başlayın.',
};

export default function SurucuKayitPage() {
  return <CourierRegisterClient />;
}
