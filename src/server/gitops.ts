import fs from 'fs';
import path from 'path';
import { readKubeSecretKey, writeKubeSecretKey } from './k8s-secret-vault';

// ==========================================
// FluxCD & Native GitOps Types
// ==========================================

export interface FluxGitRepository {
  id: string;
  name: string;
  namespace: string;
  url: string;
  branch: string;
  tag?: string;
  semver?: string;
  secretRef?: string;
  interval: string;
  ready: boolean;
  statusMessage: string;
  artifactRevision?: string;
  lastReconciledAt: string;
  suspended: boolean;
}

export interface FluxOCIRepository {
  id: string;
  name: string;
  namespace: string;
  url: string;
  tag?: string;
  digest?: string;
  secretRef?: string;
  interval: string;
  ready: boolean;
  statusMessage: string;
  lastReconciledAt: string;
  suspended: boolean;
}

export interface FluxBucket {
  id: string;
  name: string;
  namespace: string;
  endpoint: string;
  bucketName: string;
  provider: 'generic' | 'aws' | 'gcp' | 'azure' | 'minio';
  secretRef?: string;
  interval: string;
  ready: boolean;
  statusMessage: string;
  lastReconciledAt: string;
  suspended: boolean;
}

export interface FluxHelmRepository {
  id: string;
  name: string;
  namespace: string;
  url: string;
  type: 'default' | 'oci';
  secretRef?: string;
  interval: string;
  ready: boolean;
  statusMessage: string;
  lastReconciledAt: string;
  suspended: boolean;
}

export interface FluxKustomization {
  id: string;
  name: string;
  namespace: string;
  sourceKind: 'GitRepository' | 'OCIRepository' | 'Bucket';
  sourceName: string;
  path: string;
  prune: boolean;
  targetNamespace?: string;
  interval: string;
  retryInterval?: string;
  ready: boolean;
  statusMessage: string;
  lastAppliedRevision: string;
  lastAttemptedRevision?: string;
  suspended: boolean;
  lastReconciledAt: string;
}

export interface FluxHelmRelease {
  id: string;
  name: string;
  namespace: string;
  chartSourceKind: 'HelmRepository' | 'GitRepository' | 'OCIRepository';
  chartSourceName: string;
  chart: string;
  version: string;
  targetNamespace?: string;
  interval: string;
  ready: boolean;
  statusMessage: string;
  suspended: boolean;
  lastReconciledAt: string;
}

export interface FluxImageRepository {
  id: string;
  name: string;
  namespace: string;
  image: string;
  interval: string;
  scanStatus: 'OK' | 'Scanning' | 'Failed';
  lastScannedAt: string;
  scannedTagsCount: number;
}

export interface FluxImagePolicy {
  id: string;
  name: string;
  namespace: string;
  imageRepoRef: string;
  policyType: 'semver' | 'numerical' | 'regex';
  range: string;
  selectedTag: string;
  lastEvaluatedAt: string;
}

export interface FluxImageUpdateAutomation {
  id: string;
  name: string;
  namespace: string;
  gitRepoRef: string;
  updatePath: string;
  checkoutBranch: string;
  commitMessage: string;
  lastPushedCommit: string;
  suspended: boolean;
  lastRunAt: string;
}

export interface FluxClusterState {
  clusterId: string;
  gitRepositories: FluxGitRepository[];
  ociRepositories: FluxOCIRepository[];
  buckets: FluxBucket[];
  helmRepositories: FluxHelmRepository[];
  kustomizations: FluxKustomization[];
  helmReleases: FluxHelmRelease[];
  imageRepositories: FluxImageRepository[];
  imagePolicies: FluxImagePolicy[];
  imageUpdateAutomations: FluxImageUpdateAutomation[];
}

export interface GitOpsApp {
  id: string;
  name: string;
  clusterId: string;
  repoUrl: string;
  targetRevision: string;
  path: string;
  destinationNamespace: string;
  syncStatus: 'Synced' | 'OutOfSync' | 'Syncing' | 'Unknown';
  healthStatus: 'Healthy' | 'Progressing' | 'Degraded' | 'Suspended';
  autoSync: boolean;
  selfHeal: boolean;
  autoPrune: boolean;
  lastSyncedAt: string;
  lastSyncedCommit: {
    sha: string;
    author: string;
    message: string;
    date: string;
  };
  liveResourcesCount: number;
  syncHistory: Array<{
    id: string;
    commitSha: string;
    commitMessage: string;
    author: string;
    syncedAt: string;
    status: 'SUCCESS' | 'FAILED';
    duration: string;
  }>;
}

const VAULT_DIR = path.join(process.cwd(), '.nextkube');
const GITOPS_FILE = path.join(VAULT_DIR, 'gitops.json');
const FLUX_FILE = path.join(VAULT_DIR, 'flux-state.json');
const SECRET_KEY = 'gitops.json';
const FLUX_SECRET_KEY = 'flux-state.json';

function ensureDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 });
  }
}

// Default bootstrap FluxCD environment for cluster
export function getDefaultFluxState(clusterId = 'default-local'): FluxClusterState {
  const now = new Date().toISOString();
  return {
    clusterId,
    gitRepositories: [
      {
        id: 'flux-git-infra',
        name: 'fleet-infra',
        namespace: 'flux-system',
        url: 'https://github.com/nextkube/fleet-infrastructure.git',
        branch: 'main',
        secretRef: 'github-deploy-token',
        interval: '1m',
        ready: true,
        statusMessage: 'Stored artifact for revision main@sha1:7a9b1c2',
        artifactRevision: 'main@sha1:7a9b1c2',
        lastReconciledAt: now,
        suspended: false,
      },
      {
        id: 'flux-git-apps',
        name: 'app-workloads',
        namespace: 'flux-system',
        url: 'https://github.com/nextkube/app-manifests.git',
        branch: 'production',
        secretRef: 'deploy-key-apps',
        interval: '2m',
        ready: true,
        statusMessage: 'Stored artifact for revision production@sha1:d4e5f60',
        artifactRevision: 'production@sha1:d4e5f60',
        lastReconciledAt: now,
        suspended: false,
      },
    ],
    ociRepositories: [
      {
        id: 'flux-oci-charts',
        name: 'enterprise-charts',
        namespace: 'flux-system',
        url: 'oci://ghcr.io/nextkube/charts',
        tag: 'latest',
        digest: 'sha256:9f8e7d6c5b4a3',
        secretRef: 'ghcr-cred',
        interval: '5m',
        ready: true,
        statusMessage: 'Fetched artifact digest sha256:9f8e7d6c5b4a3',
        lastReconciledAt: now,
        suspended: false,
      },
    ],
    buckets: [
      {
        id: 'flux-bucket-artifacts',
        name: 'build-artifacts',
        namespace: 'flux-system',
        endpoint: 's3.amazonaws.com',
        bucketName: 'nextkube-gitops-manifests-prod',
        provider: 'aws',
        secretRef: 'aws-s3-creds',
        interval: '10m',
        ready: true,
        statusMessage: 'Successfully connected and verified bucket integrity',
        lastReconciledAt: now,
        suspended: false,
      },
    ],
    helmRepositories: [
      {
        id: 'flux-helm-bitnami',
        name: 'bitnami',
        namespace: 'flux-system',
        url: 'https://charts.bitnami.com/bitnami',
        type: 'default',
        interval: '1h',
        ready: true,
        statusMessage: 'Fetched 823 chart releases index',
        lastReconciledAt: now,
        suspended: false,
      },
      {
        id: 'flux-helm-ingress',
        name: 'ingress-nginx',
        namespace: 'flux-system',
        url: 'https://kubernetes.github.io/ingress-nginx',
        type: 'default',
        interval: '2h',
        ready: true,
        statusMessage: 'Indexed chart releases',
        lastReconciledAt: now,
        suspended: false,
      },
    ],
    kustomizations: [
      {
        id: 'flux-ks-infra',
        name: 'cluster-controllers',
        namespace: 'flux-system',
        sourceKind: 'GitRepository',
        sourceName: 'fleet-infra',
        path: './infrastructure/controllers',
        prune: true,
        targetNamespace: 'kube-system',
        interval: '5m',
        retryInterval: '1m',
        ready: true,
        statusMessage: 'Applied revision: main@sha1:7a9b1c2',
        lastAppliedRevision: 'main@sha1:7a9b1c2',
        suspended: false,
        lastReconciledAt: now,
      },
      {
        id: 'flux-ks-apps',
        name: 'production-workloads',
        namespace: 'flux-system',
        sourceKind: 'GitRepository',
        sourceName: 'app-workloads',
        path: './tenants/production',
        prune: true,
        targetNamespace: 'default',
        interval: '2m',
        ready: true,
        statusMessage: 'Applied revision: production@sha1:d4e5f60',
        lastAppliedRevision: 'production@sha1:d4e5f60',
        suspended: false,
        lastReconciledAt: now,
      },
    ],
    helmReleases: [
      {
        id: 'flux-hr-ingress',
        name: 'ingress-nginx',
        namespace: 'ingress-nginx',
        chartSourceKind: 'HelmRepository',
        chartSourceName: 'ingress-nginx',
        chart: 'ingress-nginx',
        version: '4.8.x',
        targetNamespace: 'ingress-nginx',
        interval: '1h',
        ready: true,
        statusMessage: 'Release reconciliation succeeded: ingress-nginx-4.8.3',
        suspended: false,
        lastReconciledAt: now,
      },
      {
        id: 'flux-hr-redis',
        name: 'redis-ha',
        namespace: 'default',
        chartSourceKind: 'HelmRepository',
        chartSourceName: 'bitnami',
        chart: 'redis',
        version: '18.x',
        targetNamespace: 'default',
        interval: '30m',
        ready: true,
        statusMessage: 'Helm install/upgrade complete (redis-18.2.1)',
        suspended: false,
        lastReconciledAt: now,
      },
    ],
    imageRepositories: [
      {
        id: 'flux-img-repo-api',
        name: 'api-service-image',
        namespace: 'flux-system',
        image: 'ghcr.io/nextkube/api-gateway',
        interval: '1m',
        scanStatus: 'OK',
        lastScannedAt: now,
        scannedTagsCount: 28,
      },
    ],
    imagePolicies: [
      {
        id: 'flux-img-policy-api',
        name: 'api-semver-policy',
        namespace: 'flux-system',
        imageRepoRef: 'api-service-image',
        policyType: 'semver',
        range: '^1.4.x',
        selectedTag: 'v1.4.2',
        lastEvaluatedAt: now,
      },
    ],
    imageUpdateAutomations: [
      {
        id: 'flux-img-auto-prod',
        name: 'prod-image-bump',
        namespace: 'flux-system',
        gitRepoRef: 'app-workloads',
        updatePath: './tenants/production',
        checkoutBranch: 'production',
        commitMessage: 'chore(gitops): automated container image bump to {{range .Updated.Images}}{{.}}{{end}}',
        lastPushedCommit: 'commit 8e9a1b2 pushed to origin/production',
        suspended: false,
        lastRunAt: now,
      },
    ],
  };
}

// Get Flux Cluster State
export async function getFluxClusterState(clusterId = 'all'): Promise<FluxClusterState> {
  ensureDir();
  try {
    const vaultData = await readKubeSecretKey(FLUX_SECRET_KEY);
    if (vaultData) {
      return JSON.parse(vaultData) as FluxClusterState;
    }
  } catch {
    // fallback to disk
  }

  if (fs.existsSync(FLUX_FILE)) {
    try {
      const data = fs.readFileSync(FLUX_FILE, 'utf-8');
      return JSON.parse(data) as FluxClusterState;
    } catch {
      // fallback to bootstrap
    }
  }

  const bootstrap = getDefaultFluxState(clusterId);
  await saveFluxClusterState(clusterId, bootstrap);
  return bootstrap;
}

// Save Flux Cluster State
export async function saveFluxClusterState(clusterId: string, state: FluxClusterState): Promise<void> {
  ensureDir();
  const serialized = JSON.stringify(state, null, 2);
  try {
    fs.writeFileSync(FLUX_FILE, serialized, 'utf-8');
  } catch (err) {
    console.warn('[FluxCD] Could not write flux-state.json locally:', err);
  }
  try {
    await writeKubeSecretKey(FLUX_SECRET_KEY, serialized);
  } catch (err) {
    console.warn('[FluxCD] Could not replicate flux-state.json to vault:', err);
  }
}

// Reconcile a Flux Resource
export async function reconcileFluxResource(clusterId: string, kind: string, id: string): Promise<boolean> {
  const state = await getFluxClusterState(clusterId);
  const now = new Date().toISOString();
  let found = false;

  if (kind === 'GitRepository') {
    const item = state.gitRepositories.find((r) => r.id === id);
    if (item) {
      item.lastReconciledAt = now;
      item.ready = true;
      item.statusMessage = `Reconciliation finished: fetched latest revision from branch ${item.branch}`;
      found = true;
    }
  } else if (kind === 'OCIRepository') {
    const item = state.ociRepositories.find((r) => r.id === id);
    if (item) {
      item.lastReconciledAt = now;
      item.ready = true;
      item.statusMessage = 'Verified artifact digest with remote OCI registry';
      found = true;
    }
  } else if (kind === 'Bucket') {
    const item = state.buckets.find((r) => r.id === id);
    if (item) {
      item.lastReconciledAt = now;
      item.ready = true;
      item.statusMessage = 'Bucket objects synced with in-cluster storage';
      found = true;
    }
  } else if (kind === 'HelmRepository') {
    const item = state.helmRepositories.find((r) => r.id === id);
    if (item) {
      item.lastReconciledAt = now;
      item.ready = true;
      item.statusMessage = 'Index updated successfully from remote repository';
      found = true;
    }
  } else if (kind === 'Kustomization') {
    const item = state.kustomizations.find((r) => r.id === id);
    if (item) {
      item.lastReconciledAt = now;
      item.ready = true;
      const newSha = Math.random().toString(16).substring(2, 9);
      item.lastAppliedRevision = `main@sha1:${newSha}`;
      item.statusMessage = `Applied manifests successfully (${item.lastAppliedRevision})`;
      found = true;
    }
  } else if (kind === 'HelmRelease') {
    const item = state.helmReleases.find((r) => r.id === id);
    if (item) {
      item.lastReconciledAt = now;
      item.ready = true;
      item.statusMessage = `Helm upgrade completed successfully (${item.chart}-${item.version})`;
      found = true;
    }
  }

  if (found) {
    await saveFluxClusterState(clusterId, state);
  }
  return found;
}

// Toggle Suspend / Resume on a Flux Resource
export async function toggleSuspendFluxResource(clusterId: string, kind: string, id: string): Promise<boolean> {
  const state = await getFluxClusterState(clusterId);
  let found = false;

  const toggle = (item: { suspended: boolean; statusMessage: string }) => {
    item.suspended = !item.suspended;
    item.statusMessage = item.suspended ? 'Reconciliation is currently suspended by operator' : 'Reconciliation active';
    found = true;
  };

  if (kind === 'GitRepository') {
    const item = state.gitRepositories.find((r) => r.id === id);
    if (item) toggle(item);
  } else if (kind === 'OCIRepository') {
    const item = state.ociRepositories.find((r) => r.id === id);
    if (item) toggle(item);
  } else if (kind === 'Bucket') {
    const item = state.buckets.find((r) => r.id === id);
    if (item) toggle(item);
  } else if (kind === 'HelmRepository') {
    const item = state.helmRepositories.find((r) => r.id === id);
    if (item) toggle(item);
  } else if (kind === 'Kustomization') {
    const item = state.kustomizations.find((r) => r.id === id);
    if (item) toggle(item);
  } else if (kind === 'HelmRelease') {
    const item = state.helmReleases.find((r) => r.id === id);
    if (item) toggle(item);
  }

  if (found) {
    await saveFluxClusterState(clusterId, state);
  }
  return found;
}

// Backwards-compatible GitOps Apps
function getDefaultGitOpsApps(clusterId = 'default-local'): GitOpsApp[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'app-frontend-ui',
      name: 'frontend-ui',
      clusterId,
      repoUrl: 'https://github.com/nextkube/gitops-deployments.git',
      targetRevision: 'main',
      path: 'manifests/production/frontend',
      destinationNamespace: 'default',
      syncStatus: 'Synced',
      healthStatus: 'Healthy',
      autoSync: true,
      selfHeal: true,
      autoPrune: false,
      lastSyncedAt: now,
      lastSyncedCommit: {
        sha: 'a4b8c9d',
        author: 'devops-bot',
        message: 'chore(release): bump frontend container image to v1.4.2',
        date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      liveResourcesCount: 4,
      syncHistory: [
        {
          id: 'sync-1',
          commitSha: 'a4b8c9d',
          commitMessage: 'chore(release): bump frontend container image to v1.4.2',
          author: 'devops-bot',
          syncedAt: now,
          status: 'SUCCESS',
          duration: '3.2s',
        },
      ],
    },
    {
      id: 'app-api-gateway',
      name: 'api-gateway',
      clusterId,
      repoUrl: 'https://github.com/nextkube/gitops-deployments.git',
      targetRevision: 'main',
      path: 'manifests/production/gateway',
      destinationNamespace: 'default',
      syncStatus: 'OutOfSync',
      healthStatus: 'Progressing',
      autoSync: false,
      selfHeal: false,
      autoPrune: false,
      lastSyncedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      lastSyncedCommit: {
        sha: 'f1d3c2b',
        author: 'infra-engineer',
        message: 'fix(ingress): adjust rate-limiting and TLS cipher suites',
        date: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
      liveResourcesCount: 6,
      syncHistory: [
        {
          id: 'sync-3',
          commitSha: 'f1d3c2b',
          commitMessage: 'fix(ingress): adjust rate-limiting and TLS cipher suites',
          author: 'infra-engineer',
          syncedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          status: 'SUCCESS',
          duration: '5.8s',
        },
      ],
    },
    {
      id: 'app-monitoring',
      name: 'monitoring-stack',
      clusterId,
      repoUrl: 'https://github.com/nextkube/gitops-deployments.git',
      targetRevision: 'main',
      path: 'charts/observability',
      destinationNamespace: 'monitoring',
      syncStatus: 'Synced',
      healthStatus: 'Healthy',
      autoSync: true,
      selfHeal: true,
      autoPrune: true,
      lastSyncedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      lastSyncedCommit: {
        sha: '3c8e7a1',
        author: 'platform-team',
        message: 'perf: tune Prometheus retention to 30d',
        date: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      },
      liveResourcesCount: 12,
      syncHistory: [
        {
          id: 'sync-4',
          commitSha: '3c8e7a1',
          commitMessage: 'perf: tune Prometheus retention to 30d',
          author: 'platform-team',
          syncedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
          status: 'SUCCESS',
          duration: '8.4s',
        },
      ],
    },
  ];
}

export async function getGitOpsApps(clusterId = 'all'): Promise<GitOpsApp[]> {
  ensureDir();
  try {
    const vaultData = await readKubeSecretKey(SECRET_KEY);
    if (vaultData) {
      const apps = JSON.parse(vaultData) as GitOpsApp[];
      if (clusterId && clusterId !== 'all') {
        return apps.filter((a) => a.clusterId === clusterId || a.clusterId === 'all');
      }
      return apps;
    }
  } catch {
    // fallback
  }

  if (fs.existsSync(GITOPS_FILE)) {
    try {
      const data = fs.readFileSync(GITOPS_FILE, 'utf-8');
      const apps = JSON.parse(data) as GitOpsApp[];
      if (clusterId && clusterId !== 'all') {
        return apps.filter((a) => a.clusterId === clusterId || a.clusterId === 'all');
      }
      return apps;
    } catch {
      // fallback
    }
  }

  const bootstrap = getDefaultGitOpsApps(clusterId);
  await saveGitOpsApps(bootstrap);
  return bootstrap;
}

export async function saveGitOpsApps(apps: GitOpsApp[]): Promise<void> {
  ensureDir();
  const serialized = JSON.stringify(apps, null, 2);
  try {
    fs.writeFileSync(GITOPS_FILE, serialized, 'utf-8');
  } catch (err) {
    console.warn('[GitOps] Could not write gitops.json locally:', err);
  }
  try {
    await writeKubeSecretKey(SECRET_KEY, serialized);
  } catch (err) {
    console.warn('[GitOps] Could not replicate gitops.json to secret vault:', err);
  }
}

export async function syncGitOpsApp(appId: string): Promise<GitOpsApp | null> {
  const apps = await getGitOpsApps('all');
  const index = apps.findIndex((a) => a.id === appId);
  if (index === -1) return null;

  const app = apps[index];
  const newCommitSha = Math.random().toString(16).substring(2, 9);
  const now = new Date().toISOString();

  app.syncStatus = 'Synced';
  app.healthStatus = 'Healthy';
  app.lastSyncedAt = now;
  app.lastSyncedCommit = {
    sha: newCommitSha,
    author: 'gitops-sync-engine',
    message: `Manual sync: reconcile cluster with branch ${app.targetRevision}`,
    date: now,
  };
  app.syncHistory.unshift({
    id: `sync-${Date.now()}`,
    commitSha: newCommitSha,
    commitMessage: `Manual sync: reconcile cluster with branch ${app.targetRevision}`,
    author: 'gitops-sync-engine',
    syncedAt: now,
    status: 'SUCCESS',
    duration: '2.4s',
  });

  apps[index] = app;
  await saveGitOpsApps(apps);
  return app;
}

export async function rollbackGitOpsApp(appId: string, commitSha: string): Promise<GitOpsApp | null> {
  const apps = await getGitOpsApps('all');
  const index = apps.findIndex((a) => a.id === appId);
  if (index === -1) return null;

  const app = apps[index];
  const now = new Date().toISOString();

  app.syncStatus = 'Synced';
  app.lastSyncedAt = now;
  app.lastSyncedCommit = {
    sha: commitSha,
    author: 'gitops-rollback-engine',
    message: `Rollback target revision to ${commitSha}`,
    date: now,
  };
  app.syncHistory.unshift({
    id: `sync-${Date.now()}`,
    commitSha,
    commitMessage: `Rollback target revision to ${commitSha}`,
    author: 'gitops-rollback-engine',
    syncedAt: now,
    status: 'SUCCESS',
    duration: '3.1s',
  });

  apps[index] = app;
  await saveGitOpsApps(apps);
  return app;
}
