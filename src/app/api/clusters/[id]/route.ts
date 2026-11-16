import { NextRequest, NextResponse } from 'next/server';
import { getAllClusters, deleteClusterFromVault } from '@/server/cluster-vault';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clusters = getAllClusters();
    const cluster = clusters.find((c) => c.id === id);
    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found.' }, { status: 404 });
    }
    return NextResponse.json(cluster);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteClusterFromVault(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Cluster not found or already deleted.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Cluster ${id} removed.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
