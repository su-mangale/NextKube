import { NextRequest, NextResponse } from 'next/server';
import { FleetInfo } from '@/shared/types/fleet.types';

const INITIAL_FLEETS: FleetInfo[] = [
  {
    id: 'fleet-prod',
    name: 'production-fleet',
    displayName: 'Production Fleet',
    description: 'Mission-critical production workloads across GCP and Nutanix AHV',
    environment: 'production',
    clusterSelector: { matchLabels: { tier: 'production' } },
    clusterIds: ['management-cluster', 'production-gcp'],
    labels: { tier: 'production', compliance: 'pci-dss' },
    defaultPlatformApps: ['cert-manager', 'prometheus-operator'],
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'fleet-staging',
    name: 'staging-fleet',
    displayName: 'Staging & Dev Fleet',
    description: 'Pre-production staging, continuous integration, and QA clusters on AWS',
    environment: 'staging',
    clusterSelector: { matchLabels: { tier: 'staging' } },
    clusterIds: ['staging-aws'],
    labels: { tier: 'staging', env: 'staging' },
    defaultPlatformApps: ['nginx-ingress', 'argocd'],
    createdAt: '2026-08-10T14:30:00Z',
  },
  {
    id: 'fleet-edge',
    name: 'edge-fleet',
    displayName: 'Edge & Branch Fleet',
    description: 'Distributed retail, factory, and branch office on-premise Kubernetes clusters',
    environment: 'edge',
    clusterSelector: { matchLabels: { tier: 'edge' } },
    clusterIds: [],
    labels: { footprint: 'lightweight', arch: 'arm64' },
    defaultPlatformApps: ['cert-manager'],
    createdAt: '2026-08-15T08:15:00Z',
  },
];

let fleetsStore = [...INITIAL_FLEETS];

export async function GET() {
  return NextResponse.json(fleetsStore);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newFleet: FleetInfo = {
      ...body,
      id: body.id || body.name || `fleet-${Date.now()}`,
      clusterIds: body.clusterIds || [],
      labels: body.labels || {},
      createdAt: new Date().toISOString(),
    };
    fleetsStore.push(newFleet);
    return NextResponse.json(newFleet);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
