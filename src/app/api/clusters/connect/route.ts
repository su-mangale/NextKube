import { NextRequest, NextResponse } from 'next/server';
import { saveClusterToVault } from '@/server/cluster-vault';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, method } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Cluster name is required.' }, { status: 400 });
    }

    if (!method) {
      return NextResponse.json({ success: false, error: 'Connection method is required.' }, { status: 400 });
    }

    if (method === 'kubeconfig' && !body.kubeconfigRaw) {
      return NextResponse.json({ success: false, error: 'Kubeconfig YAML is required.' }, { status: 400 });
    }

    if (method === 'serviceToken') {
      if (!body.serverUrl || !body.serviceToken) {
        return NextResponse.json(
          { success: false, error: 'Both API Server URL and ServiceAccount Token are required.' },
          { status: 400 }
        );
      }
    }

    const saveResult = await saveClusterToVault(body);

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
