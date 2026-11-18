import fs from 'fs';
import path from 'path';
import { readKubeSecretKey, writeKubeSecretKey } from './k8s-secret-vault';

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

export interface GitRepoSource {
  id: string;
  name: string;
  url: string;
  branch: string;
  type: 'github' | 'gitlab' | 'bitbucket' | 'git';
  status: 'Connected' | 'Testing' | 'Failed';
  lastChecked: string;
}

const VAULT_DIR = path.join(process.cwd(), '.nextkube');
const GITOPS_FILE = path.join(VAULT_DIR, 'gitops.json');
const SECRET_KEY = 'gitops.json';

function ensureDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 });
  }
}

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
        {
          id: 'sync-2',
          commitSha: '9e7f1a2',
          commitMessage: 'feat(config): enable responsive dark mode telemetry',
          author: 'sre-team',
          syncedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          status: 'SUCCESS',
          duration: '4.1s',
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
    // fallback to disk
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
      // fallback to bootstrap
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
