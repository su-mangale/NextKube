import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardQueryResult } from '../types/dashboard.types';
import { getBackendUrl } from '../utils/config';
import { dumpYaml, parseYaml } from '../utils/yaml';
import { getDefaultCatalogAppValues } from '../data/catalog.data';


const fetchDashboardData = async (options?: {
  simulateError?: boolean;
  simulateEmpty?: boolean;
  clusterId?: string;
}): Promise<DashboardQueryResult> => {
  if (options?.simulateError) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    throw new Error('Failed to retrieve platform dashboard data.');
  }

  if (options?.simulateEmpty) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      overview: {
        totalClusters: 0,
        healthyClusters: 0,
        provisioningClusters: 0,
        failedClusters: 0,
      },
      resources: {
        nodes: 0,
        pods: 0,
        namespaces: 0,
        deployments: 0,
      },
      utilization: {
        cpu: 0,
        memory: 0,
        storage: 0,
      },
      utilizationHistory: [],
      clusters: [],
      activities: [],
      events: [],
    };
  }

  const baseUrl = getBackendUrl();
  const isAll = !options?.clusterId || options.clusterId === 'all';
  const url = isAll
    ? `${baseUrl}/api/dashboard/fleet`
    : `${baseUrl}/api/dashboard/clusters/${options.clusterId}`;

  const res = await fetch(url);
  if (!res.ok) {
    let errorMsg = `Failed to retrieve dashboard data (${res.status}): ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) errorMsg = errorJson.detail;
      else if (errorJson.message) errorMsg = errorJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
};

export const useDashboardData = (options?: {
  simulateError?: boolean;
  simulateEmpty?: boolean;
  clusterId?: string;
}) => {
  return useQuery<DashboardQueryResult>({
    queryKey: ['dashboardData', options?.simulateError, options?.simulateEmpty, options?.clusterId],
    queryFn: () => fetchDashboardData(options),
  });
};

// ==========================================
// Cluster-Scoped Kubernetes API Resource Fetchers
// ==========================================

import {
  K8sDeployment,
  K8sService,
  K8sPod,
  K8sIngress,
  K8sConfigMap,
  K8sSecret,
  K8sNode,
  K8sEvent,
  K8sResourceQuota,
  K8sGitOps,
  K8sRolloutRevision,
  K8sPodLogs,
  K8sMachineDeployment,
  K8sHelmRelease,
  K8sDaemonSet,
  K8sStatefulSet,
  K8sReplicaSet,
  K8sCronJob,
  K8sJob,
  K8sNetworkPolicy,
  K8sPVC,
  K8sPV,
  K8sStorageClass,
  K8sServiceAccount,
  K8sRole,
  K8sRoleBinding,
  K8sCRD,
  K8sHPA,
  K8sGateway,
  K8sHTTPRoute,
  PlatformApp,
  PlatformAppSpec,
  PlatformAppInfo,
} from '../types/dashboard.types';

// Fetch Namespaces
export const fetchNamespaces = async (clusterId: string): Promise<string[]> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/namespaces`);
  if (!res.ok) throw new Error('Failed to retrieve namespaces from cluster');
  return res.json();
};

// Fetch Deployments
export const fetchDeployments = async (clusterId: string, namespace?: string): Promise<K8sDeployment[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/deployments${nsQuery}`);
  if (!res.ok) throw new Error('Failed to retrieve deployments from cluster');
  return res.json();
};

// Fetch Services
export const fetchServices = async (clusterId: string, namespace?: string): Promise<K8sService[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/services${nsQuery}`);
  if (!res.ok) throw new Error('Failed to retrieve services from cluster');
  return res.json();
};

// Fetch Pods
export const fetchPods = async (clusterId: string, namespace?: string): Promise<K8sPod[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/pods${nsQuery}`);
  if (!res.ok) throw new Error('Failed to retrieve pods from cluster');
  return res.json();
};

// Fetch Ingresses
export const fetchIngresses = async (clusterId: string, namespace?: string): Promise<K8sIngress[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/ingresses${nsQuery}`);
  if (!res.ok) throw new Error('Failed to retrieve ingresses from cluster');
  return res.json();
};

// Fetch ConfigMaps
export const fetchConfigMaps = async (clusterId: string, namespace?: string): Promise<K8sConfigMap[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/configmaps${nsQuery}`);
  if (!res.ok) throw new Error('Failed to retrieve config maps from cluster');
  return res.json();
};

// Fetch Secrets
export const fetchSecrets = async (clusterId: string, namespace?: string): Promise<K8sSecret[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  try {
    const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/secrets${nsQuery}`);
    if (res.ok) return await res.json();
  } catch {
    // Return mock fallback if network/backend is unavailable
  }
  return [
    { name: 'default-token-x89zk', namespace: 'default', type: 'kubernetes.io/service-account-token', dataCount: 3, age: '60d' },
    { name: 'cert-manager-webhook-ca', namespace: 'cert-manager', type: 'kubernetes.io/tls', dataCount: 2, age: '30d' },
    { name: 'argocd-secret', namespace: 'default', type: 'Opaque', dataCount: 5, age: '15d' },
    { name: 'ghcr-image-pull-secret', namespace: 'default', type: 'kubernetes.io/dockerconfigjson', dataCount: 1, age: '10d' },
  ].filter(s => !namespace || namespace === 'all' || s.namespace === namespace);
};

// Fetch MachineDeployments (CAPI Node Pools)
export const fetchMachineDeployments = async (clusterId: string, namespace?: string): Promise<K8sMachineDeployment[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/machinedeployments${nsQuery}`);
  if (!res.ok) throw new Error('Failed to retrieve node pools from cluster API');
  return res.json();
};

// Fetch HelmReleases (FluxCD Applications)
export const fetchHelmReleases = async (clusterId: string, namespace?: string): Promise<K8sHelmRelease[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/helmreleases${nsQuery}`);
  if (!res.ok) throw new Error('Failed to retrieve helm releases from cluster API');
  return res.json();
};

// Fetch Raw Resource YAML
export const normalizeResourceType = (type: string): string => {
  const t = (type || '').toLowerCase().trim();
  const map: Record<string, string> = {
    pod: 'pods',
    pods: 'pods',
    deployment: 'deployments',
    deployments: 'deployments',
    daemonset: 'daemonsets',
    daemonsets: 'daemonsets',
    statefulset: 'statefulsets',
    statefulsets: 'statefulsets',
    replicaset: 'replicasets',
    replicasets: 'replicasets',
    cronjob: 'cronjobs',
    cronjobs: 'cronjobs',
    job: 'jobs',
    jobs: 'jobs',
    service: 'services',
    services: 'services',
    ingress: 'ingresses',
    ingresses: 'ingresses',
    networkpolicy: 'networkpolicies',
    networkpolicies: 'networkpolicies',
    configmap: 'configmaps',
    configmaps: 'configmaps',
    secret: 'secrets',
    secrets: 'secrets',
    namespace: 'namespaces',
    namespaces: 'namespaces',
    ns: 'namespaces',
    pvc: 'persistentvolumeclaims',
    pvcs: 'persistentvolumeclaims',
    persistentvolumeclaim: 'persistentvolumeclaims',
    persistentvolumeclaims: 'persistentvolumeclaims',
    pv: 'persistentvolumes',
    pvs: 'persistentvolumes',
    persistentvolume: 'persistentvolumes',
    persistentvolumes: 'persistentvolumes',
    storageclass: 'storageclasses',
    storageclasses: 'storageclasses',
    node: 'nodes',
    nodes: 'nodes',
    serviceaccount: 'serviceaccounts',
    serviceaccounts: 'serviceaccounts',
    sa: 'serviceaccounts',
    role: 'roles',
    roles: 'roles',
    rolebinding: 'rolebindings',
    rolebindings: 'rolebindings',
    clusterrole: 'clusterroles',
    clusterroles: 'clusterroles',
    clusterrolebinding: 'clusterrolebindings',
    clusterrolebindings: 'clusterrolebindings',
    crd: 'customresourcedefinitions',
    crds: 'customresourcedefinitions',
    customresourcedefinition: 'customresourcedefinitions',
    customresourcedefinitions: 'customresourcedefinitions',
    platformapp: 'platformapps',
    platformapps: 'platformapps',
    platformappinfo: 'platformappinfos',
    platformappinfos: 'platformappinfos',
  };
  return map[t] || t;
};

export const fetchResourceYaml = async (clusterId: string, type: string, name: string, namespace: string): Promise<string> => {
  const baseUrl = getBackendUrl();
  const normalizedType = normalizeResourceType(type);
  const isClusterScoped = ['nodes', 'namespaces', 'storageclasses', 'persistentvolumes', 'clusterroles', 'clusterrolebindings', 'customresourcedefinitions'].includes(normalizedType);
  const query = isClusterScoped || !namespace || namespace === 'all' ? '' : `?namespace=${namespace}`;
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/resources/${normalizedType}/${name}/yaml${query}`);
  if (!res.ok) {
    let errorMsg = `Failed to retrieve YAML for ${normalizedType}/${name} (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) errorMsg = errorJson.detail;
      else if (errorJson.message) errorMsg = errorJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  const data = await res.json();
  return data.yaml;
};

// Scale Deployment
export const scaleDeployment = async (clusterId: string, name: string, namespace: string, replicas: number): Promise<void> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/deployments/${name}/scale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replicas, namespace }),
  });
  if (!res.ok) {
    let errorMsg = `Failed to scale deployment (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) errorMsg = errorJson.detail;
      else if (errorJson.message) errorMsg = errorJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
};

// Restart Pod
export const restartPod = async (clusterId: string, name: string, namespace: string): Promise<void> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/pods/${name}/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ namespace }),
  });
  if (!res.ok) {
    let errorMsg = `Failed to restart pod (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) errorMsg = errorJson.detail;
      else if (errorJson.message) errorMsg = errorJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
};

// Update Resource YAML
export const updateResourceYaml = async (
  clusterId: string,
  type: string,
  name: string,
  namespace: string,
  yaml: string
): Promise<void> => {
  const baseUrl = getBackendUrl();
  const normalizedType = normalizeResourceType(type);
  const isClusterScoped = ['nodes', 'namespaces', 'storageclasses', 'persistentvolumes', 'clusterroles', 'clusterrolebindings', 'customresourcedefinitions'].includes(normalizedType);
  const query = isClusterScoped || !namespace || namespace === 'all' ? '' : `?namespace=${namespace}`;
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/resources/${normalizedType}/${name}/yaml${query}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml }),
  });
  if (!res.ok) {
    let errorMsg = `Failed to update ${normalizedType}/${name} manifest (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) errorMsg = errorJson.detail;
      else if (errorJson.message) errorMsg = errorJson.message;
      else if (errorJson.title) errorMsg = errorJson.title;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
};

// Delete Resource
export const deleteResource = async (
  clusterId: string,
  type: string,
  name: string,
  namespace: string
): Promise<void> => {
  const baseUrl = getBackendUrl();
  const normalizedType = normalizeResourceType(type);
  const isClusterScoped = ['nodes', 'storageclasses', 'persistentvolumes', 'clusterroles', 'clusterrolebindings', 'customresourcedefinitions'].includes(normalizedType);
  const query = isClusterScoped || !namespace || namespace === 'all' ? '' : `?namespace=${namespace}`;
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/resources/${normalizedType}/${name}${query}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete ${normalizedType}/${name}`);
};

// Known Application CRD Mappings for Catalog Packages
export const APP_CRD_MAP: Record<string, string[]> = {
  'cert-manager': [
    'certificates.cert-manager.io',
    'issuers.cert-manager.io',
    'clusterissuers.cert-manager.io',
    'certificaterequests.cert-manager.io',
    'orders.acme.cert-manager.io',
    'challenges.acme.cert-manager.io',
  ],
  'prometheus-operator': [
    'prometheuses.monitoring.coreos.com',
    'servicemonitors.monitoring.coreos.com',
    'podmonitors.monitoring.coreos.com',
    'prometheusrules.monitoring.coreos.com',
    'alertmanagers.monitoring.coreos.com',
    'probes.monitoring.coreos.com',
    'thanosrulers.monitoring.coreos.com',
  ],
  'argocd': [
    'applications.argoproj.io',
    'appprojects.argoproj.io',
    'applicationsets.argoproj.io',
  ],
  'nginx-ingress': [
    'ingressroutes.traefik.io',
  ],
  'postgresql': [
    'postgresqls.acid.zalan.do',
  ],
  'redis': [
    'redis.redis.opstreelabs.in',
    'rediscrossclusters.redis.opstreelabs.in',
  ],
};

/**
 * Returns associated CRD names for an application by name or chart identifier
 */
export const getAppCrds = (appName: string): string[] => {
  const normalized = appName.toLowerCase().trim();
  for (const [key, crds] of Object.entries(APP_CRD_MAP)) {
    if (normalized.includes(key)) {
      return crds;
    }
  }
  return [];
};

// Rollout Restart Deployment
export const rolloutDeployment = async (
  clusterId: string,
  name: string,
  namespace: string
): Promise<void> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/deployments/${name}/rollout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ namespace }),
  });
  if (!res.ok) throw new Error('Failed to initiate rollout restart');
};


// ==========================================
// React Query Cluster Hooks
// ==========================================

export const useNamespaces = (clusterId: string) => {
  return useQuery<string[]>({
    queryKey: ['namespaces', clusterId],
    queryFn: () => fetchNamespaces(clusterId),
    enabled: !!clusterId,
  });
};

export const useDeployments = (clusterId: string, namespace?: string) => {
  return useQuery<K8sDeployment[]>({
    queryKey: ['deployments', clusterId, namespace],
    queryFn: () => fetchDeployments(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const useServices = (clusterId: string, namespace?: string) => {
  return useQuery<K8sService[]>({
    queryKey: ['services', clusterId, namespace],
    queryFn: () => fetchServices(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const usePods = (clusterId: string, namespace?: string) => {
  return useQuery<K8sPod[]>({
    queryKey: ['pods', clusterId, namespace],
    queryFn: () => fetchPods(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const useIngresses = (clusterId: string, namespace?: string) => {
  return useQuery<K8sIngress[]>({
    queryKey: ['ingresses', clusterId, namespace],
    queryFn: () => fetchIngresses(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const useConfigMaps = (clusterId: string, namespace?: string) => {
  return useQuery<K8sConfigMap[]>({
    queryKey: ['configmaps', clusterId, namespace],
    queryFn: () => fetchConfigMaps(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const useSecrets = (clusterId: string, namespace?: string) => {
  return useQuery<K8sSecret[]>({
    queryKey: ['secrets', clusterId, namespace],
    queryFn: () => fetchSecrets(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const useMachineDeployments = (clusterId: string, namespace?: string) => {
  return useQuery<K8sMachineDeployment[]>({
    queryKey: ['machinedeployments', clusterId, namespace],
    queryFn: () => fetchMachineDeployments(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const useHelmReleases = (clusterId: string, namespace?: string) => {
  return useQuery<K8sHelmRelease[]>({
    queryKey: ['helmreleases', clusterId, namespace],
    queryFn: () => fetchHelmReleases(clusterId, namespace),
    enabled: !!clusterId,
  });
};

// Fetch Nodes
export const fetchNodes = async (clusterId: string): Promise<K8sNode[]> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/nodes`);
  if (!res.ok) throw new Error('Failed to retrieve nodes from cluster');
  return res.json();
};

// Fetch GitOps syncers
export const fetchGitOps = async (clusterId: string): Promise<K8sGitOps[]> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/gitops`);
  if (!res.ok) throw new Error('Failed to retrieve GitOps pipelines from cluster');
  return res.json();
};

// Fetch Events
export const fetchEvents = async (clusterId: string, namespace?: string): Promise<K8sEvent[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/events${nsQuery}`);
  if (!res.ok) throw new Error('Failed to retrieve events from cluster');
  return res.json();
};

// Fetch Resource Quotas
export const fetchQuotas = async (clusterId: string, namespace?: string): Promise<K8sResourceQuota[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/quotas${nsQuery}`);
  if (!res.ok) throw new Error('Failed to retrieve resource quotas from cluster');
  return res.json();
};

// Hooks
export const useNodes = (clusterId: string) => {
  return useQuery<K8sNode[]>({
    queryKey: ['nodes', clusterId],
    queryFn: () => fetchNodes(clusterId),
    enabled: !!clusterId,
  });
};

export const useGitOps = (clusterId: string) => {
  return useQuery<K8sGitOps[]>({
    queryKey: ['gitops', clusterId],
    queryFn: () => fetchGitOps(clusterId),
    enabled: !!clusterId,
  });
};

export const useEvents = (clusterId: string, namespace?: string) => {
  return useQuery<K8sEvent[]>({
    queryKey: ['events', clusterId, namespace],
    queryFn: () => fetchEvents(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const useQuotas = (clusterId: string, namespace?: string) => {
  return useQuery<K8sResourceQuota[]>({
    queryKey: ['quotas', clusterId, namespace],
    queryFn: () => fetchQuotas(clusterId, namespace),
    enabled: !!clusterId,
  });
};

// Fetch Rollout History
export const fetchRolloutHistory = async (
  clusterId: string,
  name: string,
  namespace: string
): Promise<K8sRolloutRevision[]> => {
  const baseUrl = getBackendUrl();
  try {
    const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/deployments/${name}/rollouts?namespace=${namespace}`);
    if (!res.ok) throw new Error('Failed to retrieve rollout history');
    return res.json();
  } catch {
    return [
      { revision: 3, changeCause: "Updated image to ghcr.io/su-mangale/ykp-dashboard:sha-aae2aba", image: "ghcr.io/su-mangale/ykp-dashboard:sha-aae2aba", timestamp: "10 minutes ago" },
      { revision: 2, changeCause: "Scale deployment replicas to 3", image: "ghcr.io/su-mangale/ykp-dashboard:sha-8db221c", timestamp: "2 hours ago" },
      { revision: 1, changeCause: "Initial deployment", image: "ghcr.io/su-mangale/ykp-dashboard:sha-8db221c", timestamp: "1 day ago" }
    ];
  }
};

// Set Deployment Image
export const setDeploymentImage = async (
  clusterId: string,
  name: string,
  namespace: string,
  image: string
): Promise<void> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/deployments/${name}/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ namespace, image }),
  });
  if (!res.ok) throw new Error('Failed to update deployment container image');
};

export const useRolloutHistory = (clusterId: string, name: string, namespace: string, enabled: boolean) => {
  return useQuery<K8sRolloutRevision[]>({
    queryKey: ['rolloutHistory', clusterId, name, namespace],
    queryFn: () => fetchRolloutHistory(clusterId, name, namespace),
    enabled: enabled && !!clusterId && !!name,
  });
};

export interface LogOptions {
  previous?: boolean;
  since?: string;
  sinceSeconds?: number;
  tailLines?: number;
  timestamps?: boolean;
  container?: string;
}

export const parseDurationToSeconds = (since?: string): number | undefined => {
  if (!since || since === 'all' || since === 'pre') return undefined;
  const match = since.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return undefined;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === 's') return val;
  if (unit === 'm') return val * 60;
  if (unit === 'h') return val * 3600;
  if (unit === 'd') return val * 86400;
  return undefined;
};

// Fetch Pod Logs
export const fetchPodLogs = async (
  clusterId: string,
  name: string,
  namespace: string,
  options?: LogOptions
): Promise<K8sPodLogs> => {
  const baseUrl = getBackendUrl();
  const params = new URLSearchParams();
  if (namespace && namespace !== 'all') params.append('namespace', namespace);
  if (options?.previous) params.append('previous', 'true');
  if (options?.since && options.since !== 'all' && options.since !== 'pre') {
    params.append('since', options.since);
    const computedSec = options.sinceSeconds ?? parseDurationToSeconds(options.since);
    if (computedSec) params.append('sinceSeconds', String(computedSec));
  } else if (options?.sinceSeconds) {
    params.append('sinceSeconds', String(options.sinceSeconds));
  }
  if (options?.tailLines) params.append('tailLines', String(options.tailLines));
  if (options?.container) params.append('container', options.container);
  if (options?.timestamps !== false) params.append('timestamps', 'true');

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/pods/${name}/logs${queryString}`);
  if (!res.ok) throw new Error('Failed to retrieve logs from pod');
  return res.json();
};

// Fetch Deployment Logs
export const fetchDeploymentLogs = async (
  clusterId: string,
  name: string,
  namespace: string,
  options?: LogOptions
): Promise<K8sPodLogs> => {
  const baseUrl = getBackendUrl();
  const params = new URLSearchParams();
  if (namespace && namespace !== 'all') params.append('namespace', namespace);
  if (options?.previous) params.append('previous', 'true');
  if (options?.since && options.since !== 'all' && options.since !== 'pre') {
    params.append('since', options.since);
    const computedSec = options.sinceSeconds ?? parseDurationToSeconds(options.since);
    if (computedSec) params.append('sinceSeconds', String(computedSec));
  } else if (options?.sinceSeconds) {
    params.append('sinceSeconds', String(options.sinceSeconds));
  }
  if (options?.tailLines) params.append('tailLines', String(options.tailLines));
  if (options?.container) params.append('container', options.container);
  if (options?.timestamps !== false) params.append('timestamps', 'true');

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/deployments/${name}/logs${queryString}`);
  if (!res.ok) throw new Error('Failed to retrieve logs from deployment');
  return res.json();
};

export const usePodLogs = (
  clusterId: string,
  name: string,
  namespace: string,
  enabled: boolean = false,
  options?: LogOptions
) => {
  return useQuery<K8sPodLogs>({
    queryKey: ['podLogs', clusterId, name, namespace, options],
    queryFn: () => fetchPodLogs(clusterId, name, namespace, options),
    enabled: enabled && !!clusterId && !!name && !!namespace,
  });
};

export const useUpdateResourceYaml = () => {
  return useMutation({
    mutationFn: ({
      clusterId,
      type,
      name,
      namespace,
      yaml,
    }: {
      clusterId: string;
      type: string;
      name: string;
      namespace: string;
      yaml: string;
    }) => updateResourceYaml(clusterId, type, name, namespace, yaml),
  });
};

// ==========================================
// Additional Native Kubernetes API Resource Fetchers
// ==========================================

export const fetchDaemonSets = async (clusterId: string, namespace?: string): Promise<K8sDaemonSet[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/daemonsets${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch DaemonSets');
  return res.json();
};

export const useDaemonSets = (clusterId: string, namespace?: string) => {
  return useQuery<K8sDaemonSet[]>({
    queryKey: ['daemonsets', clusterId, namespace],
    queryFn: () => fetchDaemonSets(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchStatefulSets = async (clusterId: string, namespace?: string): Promise<K8sStatefulSet[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/statefulsets${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch StatefulSets');
  return res.json();
};

export const useStatefulSets = (clusterId: string, namespace?: string) => {
  return useQuery<K8sStatefulSet[]>({
    queryKey: ['statefulsets', clusterId, namespace],
    queryFn: () => fetchStatefulSets(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchReplicaSets = async (clusterId: string, namespace?: string): Promise<K8sReplicaSet[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/replicasets${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch ReplicaSets');
  return res.json();
};

export const useReplicaSets = (clusterId: string, namespace?: string) => {
  return useQuery<K8sReplicaSet[]>({
    queryKey: ['replicasets', clusterId, namespace],
    queryFn: () => fetchReplicaSets(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchCronJobs = async (clusterId: string, namespace?: string): Promise<K8sCronJob[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/cronjobs${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch CronJobs');
  return res.json();
};

export const useCronJobs = (clusterId: string, namespace?: string) => {
  return useQuery<K8sCronJob[]>({
    queryKey: ['cronjobs', clusterId, namespace],
    queryFn: () => fetchCronJobs(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchJobs = async (clusterId: string, namespace?: string): Promise<K8sJob[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/jobs${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch Jobs');
  return res.json();
};

export const useJobs = (clusterId: string, namespace?: string) => {
  return useQuery<K8sJob[]>({
    queryKey: ['jobs', clusterId, namespace],
    queryFn: () => fetchJobs(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchNetworkPolicies = async (clusterId: string, namespace?: string): Promise<K8sNetworkPolicy[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/networkpolicies${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch NetworkPolicies');
  return res.json();
};

export const useNetworkPolicies = (clusterId: string, namespace?: string) => {
  return useQuery<K8sNetworkPolicy[]>({
    queryKey: ['networkpolicies', clusterId, namespace],
    queryFn: () => fetchNetworkPolicies(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchPVCs = async (clusterId: string, namespace?: string): Promise<K8sPVC[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/pvcs${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch PVCs');
  return res.json();
};

export const usePVCs = (clusterId: string, namespace?: string) => {
  return useQuery<K8sPVC[]>({
    queryKey: ['pvcs', clusterId, namespace],
    queryFn: () => fetchPVCs(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchPVs = async (clusterId: string): Promise<K8sPV[]> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/pvs`);
  if (!res.ok) throw new Error('Failed to fetch PVs');
  return res.json();
};

export const usePVs = (clusterId: string) => {
  return useQuery<K8sPV[]>({
    queryKey: ['pvs', clusterId],
    queryFn: () => fetchPVs(clusterId),
    enabled: !!clusterId,
  });
};

export const fetchStorageClasses = async (clusterId: string): Promise<K8sStorageClass[]> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/storageclasses`);
  if (!res.ok) throw new Error('Failed to fetch StorageClasses');
  return res.json();
};

export const useStorageClasses = (clusterId: string) => {
  return useQuery<K8sStorageClass[]>({
    queryKey: ['storageclasses', clusterId],
    queryFn: () => fetchStorageClasses(clusterId),
    enabled: !!clusterId,
  });
};

export const fetchServiceAccounts = async (clusterId: string, namespace?: string): Promise<K8sServiceAccount[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/serviceaccounts${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch ServiceAccounts');
  return res.json();
};

export const useServiceAccounts = (clusterId: string, namespace?: string) => {
  return useQuery<K8sServiceAccount[]>({
    queryKey: ['serviceaccounts', clusterId, namespace],
    queryFn: () => fetchServiceAccounts(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchRoles = async (clusterId: string, namespace?: string): Promise<K8sRole[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/roles${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch Roles');
  return res.json();
};

export const useRoles = (clusterId: string, namespace?: string) => {
  return useQuery<K8sRole[]>({
    queryKey: ['roles', clusterId, namespace],
    queryFn: () => fetchRoles(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchRoleBindings = async (clusterId: string, namespace?: string): Promise<K8sRoleBinding[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/rolebindings${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch RoleBindings');
  return res.json();
};

export const useRoleBindings = (clusterId: string, namespace?: string) => {
  return useQuery<K8sRoleBinding[]>({
    queryKey: ['rolebindings', clusterId, namespace],
    queryFn: () => fetchRoleBindings(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchCRDs = async (clusterId: string): Promise<K8sCRD[]> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/crds`);
  if (!res.ok) throw new Error('Failed to fetch CRDs');
  return res.json();
};

export const useCRDs = (clusterId: string) => {
  return useQuery<K8sCRD[]>({
    queryKey: ['crds', clusterId],
    queryFn: () => fetchCRDs(clusterId),
    enabled: !!clusterId,
  });
};

export const fetchHPAs = async (clusterId: string, namespace?: string): Promise<K8sHPA[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/hpas${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch HPAs');
  return res.json();
};

export const useHPAs = (clusterId: string, namespace?: string) => {
  return useQuery<K8sHPA[]>({
    queryKey: ['hpas', clusterId, namespace],
    queryFn: () => fetchHPAs(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchGateways = async (clusterId: string, namespace?: string): Promise<K8sGateway[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/gateways${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch Gateways');
  return res.json();
};

export const useGateways = (clusterId: string, namespace?: string) => {
  return useQuery<K8sGateway[]>({
    queryKey: ['gateways', clusterId, namespace],
    queryFn: () => fetchGateways(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const fetchHTTPRoutes = async (clusterId: string, namespace?: string): Promise<K8sHTTPRoute[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/httproutes${nsQuery}`);
  if (!res.ok) throw new Error('Failed to fetch HTTPRoutes');
  return res.json();
};

export const useHTTPRoutes = (clusterId: string, namespace?: string) => {
  return useQuery<K8sHTTPRoute[]>({
    queryKey: ['httproutes', clusterId, namespace],
    queryFn: () => fetchHTTPRoutes(clusterId, namespace),
    enabled: !!clusterId,
  });
};

export const applyResourceYaml = async (
  clusterId: string,
  yaml: string,
  namespace?: string
): Promise<void> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/resources/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml, namespace }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to apply resource manifest to cluster.');
  }
};

// ==========================================
// Platform Application Operator (PlatformApp) API & Hooks
// ==========================================

export const fetchPlatformApps = async (clusterId: string, namespace?: string): Promise<PlatformApp[]> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  try {
    const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/platformapps${nsQuery}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Attempt fallback
  }

  try {
    const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/resources/platformapps${nsQuery}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    return [];
  }
  return [];
};

export const fetchPlatformApp = async (
  clusterId: string,
  name: string,
  namespace?: string
): Promise<PlatformApp | null> => {
  const baseUrl = getBackendUrl();
  const nsQuery = namespace && namespace !== 'all' ? `?namespace=${namespace}` : '';
  try {
    const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/resources/platformapps/${name}${nsQuery}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn(`Failed to retrieve PlatformApp ${name}`, e);
  }
  return null;
};

export const savePlatformApp = async (
  clusterId: string,
  name: string,
  namespace: string = 'default',
  spec: PlatformAppSpec
): Promise<void> => {
  let valuesFrom = spec.valuesFrom || [];
  const targetNs = spec.targetNamespace || namespace || 'default';

  const isManagedConfigMap =
    valuesFrom.length === 0 ||
    (valuesFrom.length === 1 &&
      valuesFrom[0].kind === 'ConfigMap' &&
      valuesFrom[0].name === `${name}-values`);

  // Automatically decouple values into a dedicated ConfigMap in destination namespace
  if (isManagedConfigMap) {
    const configMapName = `${name}-values`;

    // Ensure destination namespace exists if custom
    if (targetNs !== 'default' && targetNs !== 'ykp-system') {
      try {
        const nsYaml = dumpYaml({
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: { name: targetNs },
        });
        await updateResourceYaml(clusterId, 'namespaces', targetNs, '', nsYaml);
      } catch {
        // namespace might already exist
      }
    }

    const valuesContent =
      spec.valuesOverrides && Object.keys(spec.valuesOverrides).length > 0
        ? dumpYaml(spec.valuesOverrides)
        : getDefaultCatalogAppValues(name);

    const configMapYaml = dumpYaml({
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: configMapName,
        namespace: targetNs,
        labels: {
          'app.kubernetes.io/name': name,
          'app.kubernetes.io/part-of': 'ykp-platform',
        },
      },
      data: {
        'values.yaml': valuesContent,
      },
    });
    try {
      await updateResourceYaml(clusterId, 'configmaps', configMapName, targetNs, configMapYaml);
    } catch (err) {
      console.warn(`Failed to sync values ConfigMap for ${name}:`, err);
    }
    valuesFrom = [{ kind: 'ConfigMap', name: configMapName }];
  }

  // Construct PlatformApp Custom Resource preserving valuesOverrides in CR spec
  const resource = {
    apiVersion: 'catalog.ykp.io/v1alpha1',
    kind: 'PlatformApp',
    metadata: {
      name,
      namespace: namespace || 'default',
    },
    spec: {
      catalogAppId: spec.catalogAppId,
      version: spec.version || '1.0.0',
      enabled: Boolean(spec.enabled),
      targetNamespace: spec.targetNamespace || 'default',
      targetRef: spec.targetRef || { kind: 'Cluster', name: clusterId },
      ...(spec.clusterSelector ? { clusterSelector: spec.clusterSelector } : {}),
      lifecycle: {
        preservePVCsOnDelete: spec.lifecycle?.preservePVCsOnDelete ?? true,
        purgeCRDsOnDelete: spec.lifecycle?.purgeCRDsOnDelete ?? false,
      },
      ...(spec.dependsOn && spec.dependsOn.length > 0 ? { dependsOn: spec.dependsOn } : {}),
      ...(valuesFrom.length > 0 ? { valuesFrom } : {}),
      ...(spec.valuesOverrides && Object.keys(spec.valuesOverrides).length > 0
        ? { valuesOverrides: spec.valuesOverrides }
        : {}),
      ...(spec.remediation ? { remediation: spec.remediation } : {}),
    },
  };

  const yamlStr = dumpYaml(resource);
  await updateResourceYaml(clusterId, 'platformapps', name, namespace || 'default', yamlStr);
};

interface KubernetesConfigData {
  data?: Record<string, string>;
  stringData?: Record<string, string>;
}

export const fetchPlatformAppValues = async (
  clusterId: string,
  name: string,
  namespace: string = 'default',
  spec?: PlatformAppSpec
): Promise<string> => {
  const targetNs = spec?.targetNamespace || namespace || 'default';

  // 1. If spec has valuesFrom, read from the referenced ConfigMap or Secret in targetNs or fallback to namespace
  if (spec?.valuesFrom && spec.valuesFrom.length > 0) {
    const ref = spec.valuesFrom[0];
    const resourceType = ref.kind === 'Secret' ? 'secrets' : 'configmaps';
    try {
      const rawYaml = await fetchResourceYaml(clusterId, resourceType, ref.name, targetNs);
      const parsed = parseYaml<KubernetesConfigData>(rawYaml);
      const key = ref.valuesKey || 'values.yaml';
      if (parsed?.data && parsed.data[key]) {
        return parsed.data[key];
      }
      if (parsed?.stringData && parsed.stringData[key]) {
        return parsed.stringData[key];
      }
    } catch {
      if (targetNs !== namespace) {
        try {
          const rawYaml = await fetchResourceYaml(clusterId, resourceType, ref.name, namespace || 'default');
          const parsed = parseYaml<KubernetesConfigData>(rawYaml);
          const key = ref.valuesKey || 'values.yaml';
          if (parsed?.data && parsed.data[key]) {
            return parsed.data[key];
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // 2. If dedicated ConfigMap <name>-values exists in targetNs or namespace, read it
  try {
    const rawYaml = await fetchResourceYaml(clusterId, 'configmaps', `${name}-values`, targetNs);
    const parsed = parseYaml<KubernetesConfigData>(rawYaml);
    if (parsed?.data && parsed.data['values.yaml']) {
      return parsed.data['values.yaml'];
    }
  } catch {
    if (targetNs !== namespace) {
      try {
        const rawYaml = await fetchResourceYaml(clusterId, 'configmaps', `${name}-values`, namespace || 'default');
        const parsed = parseYaml<KubernetesConfigData>(rawYaml);
        if (parsed?.data && parsed.data['values.yaml']) {
          return parsed.data['values.yaml'];
        }
      } catch {
        // ignore
      }
    }
  }

  // 3. Fallback to legacy inline valuesOverrides if present
  if (spec?.valuesOverrides && Object.keys(spec.valuesOverrides).length > 0) {
    return dumpYaml(spec.valuesOverrides);
  }

  // 4. Default canonical catalog values for the application
  return getDefaultCatalogAppValues(name);
};

export const savePlatformAppValues = async (
  clusterId: string,
  name: string,
  namespace: string = 'default',
  valuesYaml: string
): Promise<void> => {
  const configMapName = `${name}-values`;
  const targetNs = namespace || 'default';

  if (targetNs !== 'default' && targetNs !== 'ykp-system') {
    try {
      const nsYaml = dumpYaml({
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: targetNs },
      });
      await updateResourceYaml(clusterId, 'namespaces', targetNs, '', nsYaml);
    } catch {
      // ignore
    }
  }

  const configMapYaml = dumpYaml({
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: configMapName,
      namespace: targetNs,
      labels: {
        'app.kubernetes.io/name': name,
        'app.kubernetes.io/part-of': 'ykp-platform',
      },
    },
    data: {
      'values.yaml': valuesYaml,
    },
  });
  await updateResourceYaml(clusterId, 'configmaps', configMapName, targetNs, configMapYaml);
};

export const togglePlatformApp = async (
  clusterId: string,
  name: string,
  namespace: string = 'default',
  enabled: boolean,
  currentSpec?: Partial<PlatformAppSpec>
): Promise<void> => {
  const spec: PlatformAppSpec = {
    catalogAppId: currentSpec?.catalogAppId || name,
    version: currentSpec?.version || '1.0.0',
    enabled,
    targetNamespace: currentSpec?.targetNamespace || 'default',
    targetRef: currentSpec?.targetRef,
    valuesOverrides: currentSpec?.valuesOverrides || {},
    lifecycle: currentSpec?.lifecycle || { preservePVCsOnDelete: true, purgeCRDsOnDelete: false },
  };
  await savePlatformApp(clusterId, name, namespace, spec);
};

export const deletePlatformApp = async (
  clusterId: string,
  name: string,
  namespace: string = 'default'
): Promise<void> => {
  await deleteResource(clusterId, 'platformapps', name, namespace || 'default');
};

export const usePlatformApps = (clusterId: string, namespace?: string) => {
  return useQuery<PlatformApp[]>({
    queryKey: ['platformapps', clusterId, namespace],
    queryFn: () => fetchPlatformApps(clusterId, namespace),
    enabled: !!clusterId,
    refetchInterval: 5000,
  });
};

export const usePlatformApp = (clusterId: string, name: string, namespace?: string) => {
  return useQuery<PlatformApp | null>({
    queryKey: ['platformapp', clusterId, name, namespace],
    queryFn: () => fetchPlatformApp(clusterId, name, namespace),
    enabled: !!clusterId && !!name,
  });
};

export const useTogglePlatformApp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      clusterId,
      name,
      namespace = 'default',
      enabled,
      currentSpec,
    }: {
      clusterId: string;
      name: string;
      namespace?: string;
      enabled: boolean;
      currentSpec?: Partial<PlatformAppSpec>;
    }) => togglePlatformApp(clusterId, name, namespace, enabled, currentSpec),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platformapps', variables.clusterId] });
      queryClient.invalidateQueries({ queryKey: ['platformapp', variables.clusterId, variables.name] });
      queryClient.invalidateQueries({ queryKey: ['helmreleases', variables.clusterId] });
    },
  });
};

export const useSavePlatformApp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      clusterId,
      name,
      namespace = 'default',
      spec,
    }: {
      clusterId: string;
      name: string;
      namespace?: string;
      spec: PlatformAppSpec;
    }) => savePlatformApp(clusterId, name, namespace, spec),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platformapps', variables.clusterId] });
      queryClient.invalidateQueries({ queryKey: ['platformapp', variables.clusterId, variables.name] });
      queryClient.invalidateQueries({ queryKey: ['platformappinfos', variables.clusterId] });
      queryClient.invalidateQueries({ queryKey: ['helmreleases', variables.clusterId] });
    },
  });
};

export const useDeletePlatformApp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      clusterId,
      name,
      namespace = 'default',
    }: {
      clusterId: string;
      name: string;
      namespace?: string;
    }) => deletePlatformApp(clusterId, name, namespace),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platformapps', variables.clusterId] });
      queryClient.invalidateQueries({ queryKey: ['platformapp', variables.clusterId, variables.name] });
      queryClient.invalidateQueries({ queryKey: ['helmreleases', variables.clusterId] });
    },
  });
};

// ==========================================
// PlatformAppInfo (Glasskube Resolved Metadata) API & Hooks
// ==========================================

export const fetchPlatformAppInfos = async (clusterId: string): Promise<PlatformAppInfo[]> => {
  const baseUrl = getBackendUrl();
  try {
    const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/resources/platformappinfos`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return empty fallback
  }
  return [];
};

export const fetchPlatformAppInfo = async (
  clusterId: string,
  name: string
): Promise<PlatformAppInfo | null> => {
  const baseUrl = getBackendUrl();
  try {
    const res = await fetch(`${baseUrl}/api/clusters/${clusterId}/resources/platformappinfos/${name}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn(`Failed to retrieve PlatformAppInfo ${name}`, e);
  }
  return null;
};

export const usePlatformAppInfos = (clusterId: string) => {
  return useQuery<PlatformAppInfo[]>({
    queryKey: ['platformappinfos', clusterId],
    queryFn: () => fetchPlatformAppInfos(clusterId),
    enabled: !!clusterId,
    refetchInterval: 10000,
  });
};

export const usePlatformAppInfo = (clusterId: string, name: string) => {
  return useQuery<PlatformAppInfo | null>({
    queryKey: ['platformappinfo', clusterId, name],
    queryFn: () => fetchPlatformAppInfo(clusterId, name),
    enabled: !!clusterId && !!name,
  });
};

