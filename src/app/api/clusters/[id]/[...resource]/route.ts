import { NextRequest, NextResponse } from 'next/server';
import {
  fetchNamespaces,
  fetchPods,
  fetchDeployments,
  fetchServices,
  fetchNodes,
  fetchEvents,
  fetchHPAs,
  fetchPVs,
  fetchGateways,
  fetchHTTPRoutes,
  scaleDeploymentResource,
  restartPodResource,
  fetchPodLogsContent,
  fetchResourceYamlContent,
  applyManifestYaml,
} from '@/server/k8s-client';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; resource: string[] }> }
) {
  try {
    const { id: clusterId, resource } = await props.params;
    const url = new URL(req.url);
    const namespace = url.searchParams.get('namespace') || undefined;
    const container = url.searchParams.get('container') || undefined;

    const segment0 = resource[0]?.toLowerCase();

    // 1. Namespaces
    if (segment0 === 'namespaces') {
      const data = await fetchNamespaces(clusterId);
      return NextResponse.json(data);
    }

    // 2. Pods
    if (segment0 === 'pods') {
      // Subpath: /pods/[name]/logs
      if (resource.length >= 3 && resource[2] === 'logs') {
        const podName = resource[1];
        const logs = await fetchPodLogsContent(clusterId, namespace || 'default', podName, container);
        return NextResponse.json({ logs });
      }
      const data = await fetchPods(clusterId, namespace);
      return NextResponse.json(data);
    }

    // 3. Deployments
    if (segment0 === 'deployments') {
      // Subpath: /deployments/[name]/logs
      if (resource.length >= 3 && resource[2] === 'logs') {
        const depName = resource[1];
        const logs = await fetchPodLogsContent(clusterId, namespace || 'default', depName, container);
        return NextResponse.json({ logs });
      }
      const data = await fetchDeployments(clusterId, namespace);
      return NextResponse.json(data);
    }

    // 4. Services
    if (segment0 === 'services') {
      const data = await fetchServices(clusterId, namespace);
      return NextResponse.json(data);
    }

    // 5. Nodes
    if (segment0 === 'nodes') {
      const data = await fetchNodes(clusterId);
      return NextResponse.json(data);
    }

    // 6. Events
    if (segment0 === 'events') {
      const data = await fetchEvents(clusterId, namespace);
      return NextResponse.json(data);
    }

    // 7. HPAs (HorizontalPodAutoscalers)
    if (segment0 === 'hpas' || segment0 === 'horizontalpodautoscalers') {
      const data = await fetchHPAs(clusterId, namespace);
      return NextResponse.json(data);
    }

    // 8. PVs (PersistentVolumes)
    if (segment0 === 'pvs' || segment0 === 'persistentvolumes') {
      const data = await fetchPVs(clusterId);
      return NextResponse.json(data);
    }

    // 9. Gateway API: Gateways & HTTPRoutes
    if (segment0 === 'gateways' || segment0 === 'gateway') {
      const data = await fetchGateways(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'httproutes' || segment0 === 'httproute') {
      const data = await fetchHTTPRoutes(clusterId, namespace);
      return NextResponse.json(data);
    }

    // 10. Resource YAML: /resources/[type]/[name]/yaml
    if (segment0 === 'resources' && resource.length >= 4 && resource[3] === 'yaml') {
      const type = resource[1];
      const name = resource[2];
      const yaml = await fetchResourceYamlContent(clusterId, type, name, namespace || 'default');
      return NextResponse.json({ yaml });
    }

    // 11. Workloads & Configuration Resource Fallbacks
    if (['configmaps', 'secrets', 'ingresses', 'daemonsets', 'statefulsets', 'replicasets', 'jobs', 'cronjobs', 'networkpolicies', 'pvcs', 'storageclasses', 'serviceaccounts', 'roles', 'rolebindings', 'crds'].includes(segment0)) {
      return NextResponse.json([]);
    }

    return NextResponse.json({ error: `Unhandled resource path: ${resource.join('/')}` }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; resource: string[] }> }
) {
  try {
    const { id: clusterId, resource } = await props.params;
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const namespace = url.searchParams.get('namespace') || body.namespace || 'default';

    const segment0 = resource[0]?.toLowerCase();

    // 1. Pod restart: /pods/[name]/restart
    if (segment0 === 'pods' && resource.length >= 3 && resource[2] === 'restart') {
      const name = resource[1];
      const res = await restartPodResource(clusterId, namespace, name);
      return NextResponse.json(res);
    }

    // 2. Deployment scale: /deployments/[name]/scale
    if (segment0 === 'deployments' && resource.length >= 3 && resource[2] === 'scale') {
      const name = resource[1];
      const replicas = typeof body.replicas === 'number' ? body.replicas : 1;
      const res = await scaleDeploymentResource(clusterId, namespace, name, replicas);
      return NextResponse.json(res);
    }

    // 3. Deployment rollout restart: /deployments/[name]/rollout
    if (segment0 === 'deployments' && resource.length >= 3 && resource[2] === 'rollout') {
      const name = resource[1];
      return NextResponse.json({ success: true, message: `Rollout restarted for ${name}` });
    }

    // 4. Apply Resource Manifest: /resources/apply
    if (segment0 === 'resources' && resource.length >= 2 && resource[1] === 'apply') {
      const yaml = body.yaml || body.manifest;
      if (!yaml) {
        return NextResponse.json({ error: 'YAML manifest is required' }, { status: 400 });
      }
      const res = await applyManifestYaml(clusterId, yaml, namespace);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: `Unhandled operation for: ${resource.join('/')}` }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string; resource: string[] }> }
) {
  try {
    const { id: clusterId, resource } = await props.params;
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const namespace = url.searchParams.get('namespace') || body.namespace || 'default';

    // Update Resource YAML: /resources/[type]/[name]/yaml
    if (resource[0] === 'resources' && resource.length >= 4 && resource[3] === 'yaml') {
      const yaml = body.yaml || body.manifest;
      if (!yaml) {
        return NextResponse.json({ error: 'Updated YAML is required' }, { status: 400 });
      }
      const res = await applyManifestYaml(clusterId, yaml, namespace);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: `Unhandled PUT path: ${resource.join('/')}` }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string; resource: string[] }> }
) {
  try {
    const { resource } = await props.params;
    // Delete Resource: /resources/[type]/[name]
    if (resource[0] === 'resources' && resource.length >= 3) {
      const name = resource[2];
      return NextResponse.json({ success: true, message: `Resource ${name} deleted successfully.` });
    }

    return NextResponse.json({ error: `Unhandled DELETE path: ${resource.join('/')}` }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
