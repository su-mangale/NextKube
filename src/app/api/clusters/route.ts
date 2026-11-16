import { NextResponse } from 'next/server';
import { getAllClusters } from '@/server/cluster-vault';

export async function GET() {
  try {
    const clusters = getAllClusters();
    return NextResponse.json(clusters);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve clusters.' },
      { status: 500 }
    );
  }
}
