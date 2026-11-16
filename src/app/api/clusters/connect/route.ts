import { NextRequest, NextResponse } from 'next/server';
import { saveClusterToVault } from '@/server/cluster-vault';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, method, kubeconfigRaw } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Cluster name is required.' }, { status: 400 });
    }

    if (method !== 'kubeconfig' || !kubeconfigRaw || !kubeconfigRaw.trim()) {
      return NextResponse.json(
        { success: false, error: 'Kubeconfig is the only allowed connection method. Please upload or paste a valid kubeconfig file.' },
        { status: 400 }
      );
    }

    const saveResult = await saveClusterToVault({
      ...body,
      method: 'kubeconfig',
    });

    if (!saveResult.success) {
      return NextResponse.json({ success: false, error: saveResult.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, cluster: saveResult.cluster });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error saving cluster.' },
      { status: 500 }
    );
  }
}
