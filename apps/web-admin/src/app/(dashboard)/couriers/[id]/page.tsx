import { CourierDetailClient } from '../CourierDetailClient';

type Props = { params: Promise<{ id: string }> };

export default async function CourierDetailPage({ params }: Props) {
  const { id } = await params;
  return <CourierDetailClient publicId={id} />;
}
