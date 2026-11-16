import { redirect } from 'next/navigation';

export default function ClustersIndexPage() {
  redirect('/clusters/management-cluster');
}
