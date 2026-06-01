import { CustomerDetailClient } from '../CustomerDetailClient';

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  return <CustomerDetailClient publicId={id} />;
}
