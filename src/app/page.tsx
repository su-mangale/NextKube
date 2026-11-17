import { redirect } from 'next/navigation';
import { getAllClusters } from '@/server/cluster-vault';

export const dynamic = 'force-dynamic';

export default function RootPage() {
  const clusters = getAllClusters();
  const targetId = clusters[0]?.id || 'default';
  redirect(`/clusters/${targetId}`);
}
