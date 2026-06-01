import { OrderDetailAdminClient } from './OrderDetailAdminClient';

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  return <OrderDetailAdminClient id={id} />;
}
