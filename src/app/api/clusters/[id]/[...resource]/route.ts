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
  fetchClusterTopology,
  diagnosePodResource,
  fetchHelmCatalog,
  installHelmChart,
  fetchWorkloadRolloutHistory,
  rollbackWorkloadRevision,
  fetchConfigDriftAnalysis,
  syncDriftedWorkload,
  cordonNodeResource,
  fetchNodeDrainPreview,
  drainNodeResource,
  fetchClusterSecurityPosture,
  checkRbacPermission,
  fetchRbacMatrix,
  fetchNamespaceClonePreview,
  cloneNamespaceResources,
  exportSanitizedNamespaceYaml,
} from '@/server/k8s-client';
import {
  startPortForwardSession,
  stopPortForwardSession,
  listPortForwardSessions,
  fetchPortForwardTargets,
} from '@/server/port-forward-manager';
import { recordAuditEvent, getAuditLogs, parseUserAgent } from '@/server/audit';
import {
  getGitOpsApps,
  saveGitOpsApps,
  syncGitOpsApp,
  rollbackGitOpsApp,
  type GitOpsApp,
} from '@/server/gitops';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/server/jwt';

async function extractUser(req: NextRequest): Promise<string> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session?.username) return session.username;
  }
  return 'admin';
}

function extractClientMeta(req: NextRequest): { ip: string; device: string; userAgent: string } {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || '';
  const device = parseUserAgent(userAgent);
  return { ip, device, userAgent };
}

function logAudit(
  req: NextRequest,
  user: string,
  entry: Omit<Parameters<typeof recordAuditEvent>[0], 'user' | 'ip' | 'device' | 'userAgent'> & { user?: string }
) {
  const clientMeta = extractClientMeta(req);
  return recordAuditEvent({
    ...entry,
    user: entry.user || user,
    ...clientMeta,
  });
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

    if (segment0 === 'gitops') {
      const apps = await getGitOpsApps(clusterId);
      return NextResponse.json(apps);
    }

    // Visual Topology Graph
    if (segment0 === 'topology' || segment0 === 'graph') {
      const topology = await fetchClusterTopology(clusterId, namespace);
      return NextResponse.json(topology);
    }

    // 1. Namespaces
    if (segment0 === 'namespaces') {
      if (resource.length >= 3 && resource[2] === 'clone-preview') {
        const nsName = resource[1];
        const preview = await fetchNamespaceClonePreview(clusterId, nsName);
        return NextResponse.json(preview);
      }
      if (resource.length >= 3 && (resource[2] === 'export-yaml' || resource[2] === 'export')) {
        const nsName = resource[1];
        const yaml = await exportSanitizedNamespaceYaml(clusterId, nsName);
        return NextResponse.json({ yaml });
      }
      const data = await fetchNamespaces(clusterId);
      return NextResponse.json(data);
    }

    // 2. Pods
    if (segment0 === 'pods') {
      // Subpath: /pods/[name]/diagnose (AI-Powered Root-Cause Analysis)
      if (resource.length >= 3 && resource[2] === 'diagnose') {
        const podName = resource[1];
        const report = await diagnosePodResource(clusterId, namespace || 'default', podName);
        return NextResponse.json(report);
      }
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
      // Subpath: /deployments/[name]/rollouts
      if (resource.length >= 3 && resource[2] === 'rollouts') {
        const depName = resource[1];
        const data = await fetchWorkloadRolloutHistory(
          clusterId,
          namespace || 'default',
          'deployment',
          depName
        );
        return NextResponse.json(data);
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
      if (resource.length >= 3 && resource[2] === 'drain-preview') {
        const nodeName = resource[1];
        const preview = await fetchNodeDrainPreview(clusterId, nodeName);
        return NextResponse.json(preview);
      }
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

    // 10. Helm Releases, Catalog & Values
    if (segment0 === 'helmreleases' || segment0 === 'helm' || segment0 === 'catalog') {
      if ((resource.length >= 2 && resource[1] === 'catalog') || segment0 === 'catalog') {
        const catalog = await fetchHelmCatalog();
        return NextResponse.json(catalog);
      }
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
      if (resource.length >= 3 && resource[2] === 'rollouts') {
        const dsName = resource[1];
        const data = await fetchWorkloadRolloutHistory(clusterId, namespace || 'default', 'daemonset', dsName);
        return NextResponse.json(data);
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
      if (resource.length >= 3 && resource[2] === 'rollouts') {
        const stsName = resource[1];
        const data = await fetchWorkloadRolloutHistory(clusterId, namespace || 'default', 'statefulset', stsName);
        return NextResponse.json(data);
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

    // 27. Port-Forwards & Targets: /port-forwards, /port-forwards/targets
    if (segment0 === 'port-forwards' || segment0 === 'portforwards') {
      if (resource.length >= 2 && resource[1] === 'targets') {
        const targets = await fetchPortForwardTargets(clusterId, namespace || 'default');
        return NextResponse.json(targets);
      }
      const forwards = listPortForwardSessions(clusterId);
      return NextResponse.json(forwards);
    }

    // 28. Configuration Drift Analysis: /drift
    if (segment0 === 'drift') {
      const data = await fetchConfigDriftAnalysis(clusterId, namespace);
      return NextResponse.json(data);
    }

    // Phase 5: Security Posture & CIS Benchmark: /security/posture
    if (segment0 === 'security') {
      const data = await fetchClusterSecurityPosture(clusterId);
      return NextResponse.json(data);
    }

    // Phase 5: RBAC Matrix: /rbac/matrix
    if (segment0 === 'rbac' && resource.length >= 2 && resource[1] === 'matrix') {
      const data = await fetchRbacMatrix(clusterId, namespace);
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

    // 3b. Workload Rollback to Revision: /deployments/[name]/rollback
    if (['deployments', 'statefulsets', 'daemonsets'].includes(segment0) && resource.length >= 3 && resource[2] === 'rollback') {
      const name = resource[1];
      const rev = typeof body.revision === 'number' ? body.revision : parseInt(body.revision || '1', 10);
      const res = await rollbackWorkloadRevision(clusterId, namespace, segment0, name, rev);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'CUSTOM_OPERATION',
        resourceType: segment0 === 'statefulsets' ? 'StatefulSet' : segment0 === 'daemonsets' ? 'DaemonSet' : 'Deployment',
        resourceName: name,
        namespace,
        details: `Rolled back to revision #${rev}`,
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    // 3c. Configuration Drift 1-Click Sync: /drift/sync
    if (segment0 === 'drift' && resource.length >= 2 && resource[1] === 'sync') {
      const { workloadName, workloadKind, namespace: targetNs } = body;
      const res = await syncDriftedWorkload(clusterId, targetNs || namespace, workloadKind || 'Deployment', workloadName);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'ROLLOUT_RESTART',
        resourceType: workloadKind || 'Deployment',
        resourceName: workloadName,
        namespace: targetNs || namespace,
        details: 'Synchronized configuration drift via zero-downtime rolling restart',
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    // Phase 3: Node Cordon / Uncordon: /nodes/[name]/cordon
    if (segment0 === 'nodes' && resource.length >= 3 && resource[2] === 'cordon') {
      const nodeName = resource[1];
      const unschedulable = body.unschedulable !== undefined ? Boolean(body.unschedulable) : true;
      const res = await cordonNodeResource(clusterId, nodeName, unschedulable);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'CUSTOM_OPERATION',
        resourceType: 'Node',
        resourceName: nodeName,
        namespace: '-',
        details: unschedulable ? 'Cordoned node (scheduling disabled)' : 'Uncordoned node (scheduling enabled)',
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    // Phase 3: Zero-Downtime Node Drain: /nodes/[name]/drain
    if (segment0 === 'nodes' && resource.length >= 3 && resource[2] === 'drain') {
      const nodeName = resource[1];
      const options = { nodeName, ...body };
      const res = await drainNodeResource(clusterId, options);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'CUSTOM_OPERATION',
        resourceType: 'Node',
        resourceName: nodeName,
        namespace: '-',
        details: `Drained node: ${res.evictedPods} evicted, ${res.skippedPods} skipped`,
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    // GitOps Engine Management: /gitops/[subAction]
    if (segment0 === 'gitops') {
      const subAction = resource[1]?.toLowerCase();
      if (subAction === 'sync') {
        const { appId } = body;
        const app = await syncGitOpsApp(appId);
        await logAudit(req, user, {
          clusterId,
          action: 'GITOPS_SYNC',
          resourceType: 'GitOpsApp',
          resourceName: app?.name || appId,
          namespace: app?.destinationNamespace || 'default',
          details: `Reconciled and synced GitOps application with commit ${app?.lastSyncedCommit.sha}`,
          status: app ? 'SUCCESS' : 'FAILED',
        });
        return NextResponse.json(app);
      }
      if (subAction === 'rollback') {
        const { appId, commitSha } = body;
        const app = await rollbackGitOpsApp(appId, commitSha);
        await logAudit(req, user, {
          clusterId,
          action: 'GITOPS_ROLLBACK',
          resourceType: 'GitOpsApp',
          resourceName: app?.name || appId,
          namespace: app?.destinationNamespace || 'default',
          details: `Rolled back GitOps application to revision ${commitSha}`,
          status: app ? 'SUCCESS' : 'FAILED',
        });
        return NextResponse.json(app);
      }
      if (subAction === 'create') {
        const apps = await getGitOpsApps('all');
        const newApp: GitOpsApp = {
          id: `app-${Date.now()}`,
          clusterId,
          name: body.name || 'new-app',
          repoUrl: body.repoUrl || 'https://github.com/my-org/manifests.git',
          targetRevision: body.targetRevision || 'main',
          path: body.path || 'manifests',
          destinationNamespace: body.destinationNamespace || namespace || 'default',
          syncStatus: 'Synced',
          healthStatus: 'Healthy',
          autoSync: Boolean(body.autoSync),
          selfHeal: Boolean(body.selfHeal),
          autoPrune: Boolean(body.autoPrune),
          lastSyncedAt: new Date().toISOString(),
          lastSyncedCommit: {
            sha: Math.random().toString(16).substring(2, 9),
            author: user,
            message: 'Initial GitOps application registration',
            date: new Date().toISOString(),
          },
          liveResourcesCount: 3,
          syncHistory: [{
            id: `sync-${Date.now()}`,
            commitSha: Math.random().toString(16).substring(2, 9),
            commitMessage: 'Initial GitOps application registration',
            author: user,
            syncedAt: new Date().toISOString(),
            status: 'SUCCESS',
            duration: '1.8s',
          }],
        };
        apps.unshift(newApp);
        await saveGitOpsApps(apps);
        await logAudit(req, user, {
          clusterId,
          action: 'GITOPS_SYNC',
          resourceType: 'GitOpsApp',
          resourceName: newApp.name,
          namespace: newApp.destinationNamespace,
          details: `Created new GitOps application ${newApp.name} tracking ${newApp.repoUrl}`,
          status: 'SUCCESS',
        });
        return NextResponse.json(newApp);
      }
    }

    // Phase 5: RBAC "Can I do X?" Policy Check: /rbac/can-i
    if (segment0 === 'rbac' && resource.length >= 2 && resource[1] === 'can-i') {
      const res = await checkRbacPermission(clusterId, body);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'CUSTOM_OPERATION',
        resourceType: 'RBAC',
        resourceName: body.subjectName || 'subject',
        namespace: body.namespace || namespace,
        details: `RBAC check: ${body.verb} ${body.resource} -> ${res.allowed ? 'ALLOWED' : 'DENIED'}`,
        status: 'SUCCESS',
      });
      return NextResponse.json(res);
    }

    // Phase 6: Namespace Cloner: /namespaces/clone
    if (segment0 === 'namespaces' && resource.length >= 2 && resource[1] === 'clone') {
      const res = await cloneNamespaceResources(clusterId, body);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'CUSTOM_OPERATION',
        resourceType: 'Namespace',
        resourceName: body.targetNamespace || 'target',
        namespace: body.targetNamespace || 'target',
        details: `Cloned namespace '${body.sourceNamespace}' -> '${body.targetNamespace}' (${res.totalCreated} created)`,
        status: res.success ? 'SUCCESS' : 'FAILED',
        errorMessage: res.success ? undefined : res.message,
      });
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    // Helm Install from App Store: /helm/install
    if (segment0 === 'helm' && resource.length >= 2 && resource[1] === 'install') {
      const { chartName, releaseName, valuesYaml, targetNamespace } = body;
      const res = await installHelmChart(clusterId, targetNamespace || namespace, releaseName, chartName, valuesYaml || '');
      await recordAuditEvent({
        clusterId,
        user,
        action: 'CUSTOM_OPERATION',
        resourceType: 'HelmRelease',
        resourceName: releaseName,
        namespace: targetNamespace || namespace,
        details: `Installed Helm chart '${chartName}'`,
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

    // 6. Start Port-Forward: /port-forwards
    if (segment0 === 'port-forwards' || segment0 === 'portforwards') {
      const session = await startPortForwardSession(clusterId, body);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'CUSTOM_OPERATION',
        resourceType: 'PortForward',
        resourceName: `${session.targetType}/${session.targetName}`,
        namespace: session.namespace,
        details: `Started port-forward :${session.localPort} -> :${session.targetPort}`,
        status: 'SUCCESS',
      });
      return NextResponse.json(session);
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

    // 3. Stop Port-Forward Session: /port-forwards/[sessionId]
    if ((segment0 === 'port-forwards' || segment0 === 'portforwards') && resource.length >= 2) {
      const sessionId = resource[1];
      const ok = await stopPortForwardSession(sessionId);
      await recordAuditEvent({
        clusterId,
        user,
        action: 'DELETE_RESOURCE',
        resourceType: 'PortForward',
        resourceName: sessionId,
        namespace,
        details: `Stopped port-forward session ${sessionId}`,
        status: ok ? 'SUCCESS' : 'FAILED',
      });
      return NextResponse.json({ success: ok });
    }

    // 4. Delete GitOps App: /gitops/[appId]
    if (segment0 === 'gitops' && resource.length >= 2) {
      const appId = resource[1];
      const apps = await getGitOpsApps('all');
      const filtered = apps.filter((a) => a.id !== appId);
      await saveGitOpsApps(filtered);
      await logAudit(req, user, {
        clusterId,
        action: 'DELETE_RESOURCE',
        resourceType: 'GitOpsApp',
        resourceName: appId,
        namespace: 'system',
        details: `Deleted GitOps application ${appId}`,
        status: 'SUCCESS',
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Unhandled DELETE path: ${resource.join('/')}` }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
