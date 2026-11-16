import { NextRequest, NextResponse } from 'next/server';
import { testClusterConnection } from '@/server/cluster-vault';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method } = body;

    if (!method) {
      return NextResponse.json({ success: false, error: 'Connection method is required.' }, { status: 400 });
    }

    if (method === 'kubeconfig' && !body.kubeconfigRaw) {
      return NextResponse.json({ success: false, error: 'Kubeconfig YAML content is required.' }, { status: 400 });
    }

    if (method === 'serviceToken') {
      if (!body.serverUrl || !body.serviceToken) {
        return NextResponse.json(
          { success: false, error: 'Both API Server URL and ServiceAccount Token are required.' },
          { status: 400 }
        );
      }
    }

    const result = await testClusterConnection(body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal connection check error.' },
      { status: 500 }
    );
  }
}
