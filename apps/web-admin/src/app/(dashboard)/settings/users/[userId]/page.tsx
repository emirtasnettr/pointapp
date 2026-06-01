import { StaffUserDetailClient } from './StaffUserDetailClient';

export default async function StaffUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <StaffUserDetailClient userId={userId} />;
}
