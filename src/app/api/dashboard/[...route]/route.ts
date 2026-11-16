import { NextRequest, NextResponse } from 'next/server';
import { fetchDashboardOverview } from '@/server/k8s-client';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route } = await props.params;

    // Route matching:
    // /api/dashboard/fleet -> ['fleet']
    // /api/dashboard/clusters/:id -> ['clusters', ':id']
    const clusterId = route.length >= 2 && route[0] === 'clusters' ? route[1] : 'fleet';
    const overview = await fetchDashboardOverview(clusterId);
    return NextResponse.json(overview);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
