import { NextRequest, NextResponse } from 'next/server';
import {
  fetchNamespaces,
  fetchPods,
  fetchDeployments,
  fetchDaemonSets,
  fetchStatefulSets,
  fetchReplicaSets,
  fetchJobs,
  fetchCronJobs,
  fetchServices,
  fetchIngresses,
  fetchIngressClasses,
  fetchNetworkPolicies,
  fetchConfigMaps,
  fetchSecrets,
  fetchPVCs,
  fetchStorageClasses,
  fetchServiceAccounts,
  fetchRoles,
  fetchRoleBindings,
  fetchCRDs,
  fetchNodes,
  fetchEvents,
  fetchHPAs,
  fetchPVs,
  fetchGateways,
  fetchHTTPRoutes,
  fetchHelmReleases,
  fetchHelmReleaseValues,
  rollbackHelmRelease,
  uninstallHelmRelease,
  scaleDeploymentResource,
  restartDeploymentResource,
  restartPodResource,
  deleteResourceObject,
  evaluateClusterHealth,
  fetchPodLogsContent,
  fetchWorkloadLogsContent,
  fetchResourceYamlContent,
  applyManifestYaml,
} from '@/server/k8s-client';
import { recordAuditEvent, getAuditLogs } from '@/server/audit';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/server/jwt';

async function extractUser(req: NextRequest): Promise<string> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session?.username) return session.username;
  }
  return 'admin';
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; resource: string[] }> }
) {
  try {
    const { id: clusterId, resource } = await props.params;
    const url = new URL(req.url);
    const namespace = url.searchParams.get('namespace') || undefined;
    const container = url.searchParams.get('container') || undefined;
    const previous = url.searchParams.get('previous') === 'true';
    const tailLinesStr = url.searchParams.get('tailLines');
    const tailLines = tailLinesStr ? parseInt(tailLinesStr, 10) : 200;
    const sinceSecondsStr = url.searchParams.get('sinceSeconds');
    const sinceSeconds = sinceSecondsStr ? parseInt(sinceSecondsStr, 10) : undefined;

    const segment0 = resource[0]?.toLowerCase();

    // 0. Cluster Health & Audit Logs
    if (segment0 === 'health') {
      const report = await evaluateClusterHealth(clusterId);
      return NextResponse.json(report);
    }

    if (segment0 === 'audit') {
      const logs = await getAuditLogs(clusterId);
      return NextResponse.json(logs);
    }

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
        const logs = await fetchPodLogsContent(
          clusterId,
          namespace || 'default',
          podName,
          container,
          tailLines,
          previous,
          sinceSeconds
        );
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
        const logs = await fetchWorkloadLogsContent(
          clusterId,
          namespace || 'default',
          'deployment',
          depName,
          container,
          tailLines,
          previous,
          sinceSeconds
        );
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
    if (segment0 === 'pvs' || segment0 === 'pv' || segment0 === 'persistentvolumes' || segment0 === 'persistentvolume' || segment0 === 'persistent-volumes' || segment0 === 'persistent-volume') {
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

    // 10. Helm Releases & Values
    if (segment0 === 'helmreleases' || segment0 === 'helm') {
      if (resource.length >= 3 && resource[2] === 'values') {
        const name = resource[1];
        const values = await fetchHelmReleaseValues(clusterId, name, namespace || 'default');
        return NextResponse.json({ values });
      }
      const data = await fetchHelmReleases(clusterId, namespace);
      return NextResponse.json(data);
    }

    // 11. Resource YAML: /resources/[type]/[name]/yaml
    if (segment0 === 'resources' && resource.length >= 4 && resource[3] === 'yaml') {
      const type = resource[1];
      const name = resource[2];
      const yaml = await fetchResourceYamlContent(clusterId, type, name, namespace || 'default');
      return NextResponse.json({ yaml });
    }

    // 12. Native Kubernetes Workloads & Resources
    if (segment0 === 'daemonsets' || segment0 === 'daemonset' || segment0 === 'daemon-sets' || segment0 === 'daemon-set') {
      if (resource.length >= 3 && resource[2] === 'logs') {
        const dsName = resource[1];
        const logs = await fetchWorkloadLogsContent(
          clusterId,
          namespace || 'default',
          'daemonset',
          dsName,
          container,
          tailLines,
          previous,
          sinceSeconds
        );
        return NextResponse.json({ logs });
      }
      const data = await fetchDaemonSets(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'statefulsets' || segment0 === 'statefulset' || segment0 === 'stateful-sets' || segment0 === 'stateful-set') {
      if (resource.length >= 3 && resource[2] === 'logs') {
        const stsName = resource[1];
        const logs = await fetchWorkloadLogsContent(
          clusterId,
          namespace || 'default',
          'statefulset',
          stsName,
          container,
          tailLines,
          previous,
          sinceSeconds
        );
        return NextResponse.json({ logs });
      }
      const data = await fetchStatefulSets(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'replicasets' || segment0 === 'replicaset' || segment0 === 'replica-sets' || segment0 === 'replica-set') {
      const data = await fetchReplicaSets(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'jobs' || segment0 === 'job') {
      if (resource.length >= 3 && resource[2] === 'logs') {
        const jobName = resource[1];
        const logs = await fetchWorkloadLogsContent(
          clusterId,
          namespace || 'default',
          'job',
          jobName,
          container,
          tailLines,
          previous,
          sinceSeconds
        );
        return NextResponse.json({ logs });
      }
      const data = await fetchJobs(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'cronjobs' || segment0 === 'cronjob' || segment0 === 'cron-jobs' || segment0 === 'cron-job') {
      const data = await fetchCronJobs(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'ingresses' || segment0 === 'ingress') {
      const data = await fetchIngresses(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'ingressclasses' || segment0 === 'ingressclass' || segment0 === 'ingress-classes' || segment0 === 'ingress-class') {
      const data = await fetchIngressClasses(clusterId);
      return NextResponse.json(data);
    }

    if (segment0 === 'networkpolicies' || segment0 === 'networkpolicy' || segment0 === 'network-policies' || segment0 === 'network-policy') {
      const data = await fetchNetworkPolicies(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'configmaps' || segment0 === 'configmap' || segment0 === 'config-maps' || segment0 === 'config-map') {
      const data = await fetchConfigMaps(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'secrets' || segment0 === 'secret') {
      const data = await fetchSecrets(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'pvcs' || segment0 === 'pvc' || segment0 === 'persistentvolumeclaims' || segment0 === 'persistentvolumeclaim' || segment0 === 'persistent-volume-claims' || segment0 === 'persistent-volume-claim') {
      const data = await fetchPVCs(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'storageclasses' || segment0 === 'storageclass' || segment0 === 'storage-classes' || segment0 === 'storage-class') {
      const data = await fetchStorageClasses(clusterId);
      return NextResponse.json(data);
    }

    if (segment0 === 'serviceaccounts' || segment0 === 'serviceaccount' || segment0 === 'service-accounts' || segment0 === 'service-account') {
      const data = await fetchServiceAccounts(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'roles' || segment0 === 'role' || segment0 === 'clusterroles' || segment0 === 'clusterrole') {
      const data = await fetchRoles(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'rolebindings' || segment0 === 'rolebinding' || segment0 === 'clusterrolebindings' || segment0 === 'clusterrolebinding' || segment0 === 'role-bindings' || segment0 === 'role-binding') {
      const data = await fetchRoleBindings(clusterId, namespace);
      return NextResponse.json(data);
    }

    if (segment0 === 'crds' || segment0 === 'crd' || segment0 === 'customresourcedefinitions' || segment0 === 'customresourcedefinition' || segment0 === 'custom-resource-definitions' || segment0 === 'custom-resource-definition') {
      const data = await fetchCRDs(clusterId);
      return NextResponse.json(data);
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
    const user = await extractUser(req);

    const segment0 = resource[0]?.toLowerCase();

    // 1. Pod restart: /pods/[name]/restart
    if (segment0 === 'pods' && resource.length >= 3 && resource[2] === 'restart') {
      const name = resource[1];
      const res = await restartPodResource(clusterId, namespace, name);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'CUSTOM_OPERATION',
        resourceType: 'Pod',
        resourceName: name,
        namespace,
        details: 'Restarted pod container',
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    // 2. Deployment scale: /deployments/[name]/scale or statefulsets / replicasets
    if (['deployments', 'statefulsets', 'replicasets'].includes(segment0) && resource.length >= 3 && resource[2] === 'scale') {
      const name = resource[1];
      const replicas = typeof body.replicas === 'number' ? body.replicas : 1;
      const typeLabel = segment0 === 'statefulsets' ? 'StatefulSet' : segment0 === 'replicasets' ? 'ReplicaSet' : 'Deployment';
      const res = await scaleDeploymentResource(clusterId, namespace, name, replicas, typeLabel);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'SCALE_REPLICAS',
        resourceType: typeLabel,
        resourceName: name,
        namespace,
        details: `Scaled replicas to ${replicas}`,
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    // 3. Deployment rollout restart: /deployments/[name]/rollout
    if (segment0 === 'deployments' && resource.length >= 3 && resource[2] === 'rollout') {
      const name = resource[1];
      const res = await restartDeploymentResource(clusterId, namespace, name);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'ROLLOUT_RESTART',
        resourceType: 'Deployment',
        resourceName: name,
        namespace,
        details: 'Triggered rolling update restart',
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    // 4. Apply Resource Manifest: /resources/apply
    if (segment0 === 'resources' && resource.length >= 2 && resource[1] === 'apply') {
      const yaml = body.yaml || body.manifest;
      if (!yaml) {
        return NextResponse.json({ error: 'YAML manifest is required' }, { status: 400 });
      }
      const res = await applyManifestYaml(clusterId, yaml, namespace);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'APPLY_MANIFEST',
        resourceType: 'Manifest',
        resourceName: 'CustomManifest',
        namespace,
        details: 'Applied resource manifest YAML',
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
      return NextResponse.json(res);
    }

    // 5. Helm Rollback: /helmreleases/[name]/rollback
    if ((segment0 === 'helmreleases' || segment0 === 'helm') && resource.length >= 3 && resource[2] === 'rollback') {
      const name = resource[1];
      const rev = typeof body.revision === 'number' ? body.revision : parseInt(body.revision || '1', 10);
      const res = await rollbackHelmRelease(clusterId, name, namespace, rev);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'CUSTOM_OPERATION',
        resourceType: 'HelmRelease',
        resourceName: name,
        namespace,
        details: `Rolled back Helm release to revision ${rev}`,
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
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
    const user = await extractUser(req);

    // Update Resource YAML: /resources/[type]/[name]/yaml
    if (resource[0] === 'resources' && resource.length >= 4 && resource[3] === 'yaml') {
      const type = resource[1];
      const name = resource[2];
      const yaml = body.yaml || body.manifest;
      if (!yaml) {
        return NextResponse.json({ error: 'Updated YAML is required' }, { status: 400 });
      }
      const res = await applyManifestYaml(clusterId, yaml, namespace);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'APPLY_MANIFEST',
        resourceType: type,
        resourceName: name,
        namespace,
        details: `Updated manifest for ${type}/${name}`,
        status: res.success ? 'SUCCESS' : 'FAILED',
      });
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
    const { id: clusterId, resource } = await props.params;
    const user = await extractUser(req);
    const url = new URL(req.url);
    const namespace = url.searchParams.get('namespace') || 'default';

    // Delete Resource: /resources/[type]/[name]
    if (resource[0] === 'resources' && resource.length >= 3) {
      const type = resource[1];
      const name = resource[2];
      const res = await deleteResourceObject(clusterId, type, name, namespace);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'DELETE_RESOURCE',
        resourceType: type,
        resourceName: name,
        namespace,
        details: `Deleted ${type}/${name}`,
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    // Uninstall Helm Release: /helmreleases/[name]
    const segment0 = resource[0]?.toLowerCase();
    if ((segment0 === 'helmreleases' || segment0 === 'helm') && resource.length >= 2) {
      const name = resource[1];
      const res = await uninstallHelmRelease(clusterId, name, namespace);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'DELETE_RESOURCE',
        resourceType: 'HelmRelease',
        resourceName: name,
        namespace,
        details: `Uninstalled Helm release ${name}`,
        status: res.success ? 'SUCCESS' : 'FAILED',
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: `Unhandled DELETE path: ${resource.join('/')}` }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
