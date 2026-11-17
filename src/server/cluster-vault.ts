import * as k8s from '@kubernetes/client-node';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AttachedClusterPayload, ClusterConnectionTestResult, FleetEnvironment } from '@/shared/types/fleet.types';

const STORE_DIR = path.join(process.cwd(), '.nextkube');
const STORE_FILE = path.join(STORE_DIR, 'clusters.json');

export interface EncryptedVaultPayload {
  method: 'kubeconfig' | 'serviceToken' | 'agent';
  kubeconfigRaw?: string;
  contextName?: string;
  serverUrl?: string;
  serviceToken?: string;
  caCert?: string;
  skipTls?: boolean;
}

export interface StoredClusterRecord {
  id: string;
  name: string;
  type: 'management' | 'workload';
  managedType: 'attached' | 'provisioned';
  provider: string;
  environment: FleetEnvironment;
  status: 'Healthy' | 'Provisioning' | 'Failed' | 'Degraded';
  version?: string;
  nodeCount?: number;
  fleetId: string;
  serverUrl?: string;
  labels?: Record<string, string>;
  // AES-256-GCM ciphertext
  encryptedData?: string;
  iv?: string;
  tag?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SanitizedClusterInfo {
  id: string;
  name: string;
  type: 'management' | 'workload';
  managedType: 'attached' | 'provisioned';
  provider: string;
  environment: FleetEnvironment;
  status: 'Healthy' | 'Provisioning' | 'Failed' | 'Degraded';
  version?: string;
  nodeCount?: number;
  fleetId: string;
  serverUrl?: string;
  labels?: Record<string, string>;
  createdAt: string;
}

function getEncryptionKey(): Buffer {
  if (!process.env.NEXTKUBE_ENCRYPTION_KEY && !process.env.NEXTKUBE_AUTH_SECRET) {
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const idx = trimmed.indexOf('=');
            if (idx > 0) {
              const k = trimmed.substring(0, idx).trim();
              const v = trimmed.substring(idx + 1).trim();
              if (!process.env[k]) {
                process.env[k] = v;
              }
            }
          }
        });
      }
    } catch {}
  }
  const rawKey =
    process.env.NEXTKUBE_ENCRYPTION_KEY ||
    process.env.NEXTKUBE_AUTH_SECRET ||
    'nextkube-default-cluster-vault-secret-key-32chars!';
  return crypto.createHash('sha256').update(rawKey).digest();
}

function encryptPayload(payload: EncryptedVaultPayload): { ciphertext: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const str = JSON.stringify(payload);
  let enc = cipher.update(str, 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    ciphertext: enc,
    iv: iv.toString('hex'),
    tag,
  };
}

function decryptPayload(ciphertext: string, ivHex: string, tagHex: string): EncryptedVaultPayload | null {
  const keysToTry = [
    getEncryptionKey(),
    crypto.createHash('sha256').update('nextkube-default-cluster-vault-secret-key-32chars!').digest(),
    crypto.createHash('sha256').update('nextkube-super-secure-jwt-auth-secret-32chars!').digest(),
  ];

  for (const key of keysToTry) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      let dec = decipher.update(ciphertext, 'hex', 'utf8');
      dec += decipher.final('utf8');
      return JSON.parse(dec);
    } catch {
      // try next candidate key
    }
  }

  console.error('[ClusterVault] Failed to decrypt cluster payload with available vault keys.');
  return null;
}

function ensureStoreDir(): void {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

const DEFAULT_INITIAL_CLUSTERS: StoredClusterRecord[] = [];

function readStoredClusters(): StoredClusterRecord[] {
  ensureStoreDir();
  if (!fs.existsSync(STORE_FILE)) {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    } catch {
      return [];
    }
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const records: StoredClusterRecord[] = JSON.parse(raw);
    // Only return clusters that have encrypted vault credentials attached via Kubeconfig
    const valid = records.filter(
      (r) => Boolean(r.encryptedData && r.iv && r.tag)
    );
    if (valid.length !== records.length) {
      writeStoredClusters(valid);
    }
    return valid;
  } catch (err) {
    console.error('[ClusterVault] Failed to read store file:', err);
    return [];
  }
}

function writeStoredClusters(records: StoredClusterRecord[]): void {
  ensureStoreDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

/**
 * Builds an active @kubernetes/client-node KubeConfig from an AttachedClusterPayload.
 * Kubeconfig is the strictly enforced single connection method.
 */
export function buildKubeConfig(payload: {
  method?: string;
  kubeconfigRaw?: string;
  contextName?: string;
}): { kc: k8s.KubeConfig; serverUrl?: string } {
  const kc = new k8s.KubeConfig();
  let serverUrl: string | undefined;

  if (payload.kubeconfigRaw) {
    kc.loadFromString(payload.kubeconfigRaw);
    if (payload.contextName) {
      kc.setCurrentContext(payload.contextName);
    }
    const current = kc.getCurrentCluster();
    if (current && current.server?.startsWith('http://') && !current.skipTLSVerify) {
      (current as any).skipTLSVerify = true;
    }
    serverUrl = current?.server;
  } else {
    throw new Error('A valid Kubeconfig YAML file or text is required to connect to the cluster.');
  }

  return { kc, serverUrl };
}

/**
 * Tests live connectivity to a Kubernetes API Server.
 */
export async function testClusterConnection(
  payload: Pick<
    AttachedClusterPayload,
    'method' | 'kubeconfigRaw' | 'contextName' | 'serverUrl' | 'serviceToken' | 'caCert' | 'skipTls'
  >
): Promise<ClusterConnectionTestResult> {
  const startTime = Date.now();
  try {
    const { kc, serverUrl } = buildKubeConfig(payload);
    const versionApi = kc.makeApiClient(k8s.VersionApi);

    // Ping API server version endpoint
    const versionInfo = await versionApi.getCode();
    const latencyMs = Date.now() - startTime;
    const versionStr = `v${versionInfo.major}.${versionInfo.minor.replace(/\D/g, '')}`;

    // Probe nodes to check RBAC permissions and node count
    let nodeCount: number | undefined;
    try {
      const coreApi = kc.makeApiClient(k8s.CoreV1Api);
      const nodesRes = await coreApi.listNode();
      nodeCount = nodesRes.items.length;
    } catch {
      // If ServiceAccount does not have cluster-wide node list permission, fallback gracefully
      nodeCount = undefined;
    }

    return {
      success: true,
      version: versionStr,
      nodeCount,
      serverUrl,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    let errorMsg = err.message || 'Failed to reach Kubernetes API server.';

    if (err.code === 'ECONNREFUSED') {
      errorMsg = 'Connection refused. Check API Server URL and cluster firewall/ingress.';
    } else if (err.code === 'ENOTFOUND') {
      errorMsg = 'Host not found. Verify DNS name or IP address.';
    } else if (err.statusCode === 401 || err.statusCode === 403) {
      errorMsg = `Kubernetes Authentication failed (${err.statusCode}): Check token validity and RBAC permissions.`;
    } else if (err.message && err.message.includes('DEPTH_ZERO_SELF_SIGNED_CERT')) {
      errorMsg = 'Self-signed certificate detected. Provide CA certificate or enable "Skip TLS Verify".';
    }

    return {
      success: false,
      error: errorMsg,
      latencyMs,
    };
  }
}

/**
 * Returns all clusters with sanitized public metadata (no credentials exposed).
 */
export function getAllClusters(): SanitizedClusterInfo[] {
  const clusters = readStoredClusters();
  return clusters.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    managedType: c.managedType,
    provider: c.provider,
    environment: c.environment,
    status: c.status,
    version: c.version,
    nodeCount: c.nodeCount,
    fleetId: c.fleetId,
    serverUrl: c.serverUrl,
    labels: c.labels,
    createdAt: c.createdAt,
  }));
}

/**
 * Saves a new cluster into the encrypted vault after pre-flight check.
 */
export async function saveClusterToVault(
  payload: AttachedClusterPayload
): Promise<{ success: boolean; cluster?: SanitizedClusterInfo; error?: string }> {
  try {
    if (payload.method !== 'kubeconfig' || !payload.kubeconfigRaw?.trim()) {
      return { success: false, error: 'Only Kubeconfig files are allowed to connect to the cluster.' };
    }

    const clusterId = payload.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

    // Run connection test
    const testResult = await testClusterConnection(payload);
    const initialStatus = testResult.success ? 'Healthy' : 'Degraded';
    const initialVersion = testResult.version || payload.version || 'v1.31.0';
    const initialNodes = testResult.nodeCount ?? payload.nodeCount ?? 1;

    // Encrypt sensitive authentication payload
    const vaultData: EncryptedVaultPayload = {
      method: payload.method,
      kubeconfigRaw: payload.kubeconfigRaw,
      contextName: payload.contextName,
      serverUrl: payload.serverUrl,
      serviceToken: payload.serviceToken,
      caCert: payload.caCert,
      skipTls: payload.skipTls,
    };

    const { ciphertext, iv, tag } = encryptPayload(vaultData);

    const now = new Date().toISOString();
    const newRecord: StoredClusterRecord = {
      id: clusterId,
      name: payload.name.trim(),
      type: 'workload',
      managedType: 'attached',
      provider: payload.provider || 'Custom',
      environment: payload.environment || 'production',
      status: initialStatus,
      version: initialVersion,
      nodeCount: initialNodes,
      fleetId: payload.fleetId || 'fleet-prod',
      serverUrl: testResult.serverUrl || payload.serverUrl,
      labels: payload.labels || {
        environment: payload.environment || 'production',
        importMethod: payload.method,
        managedBy: 'nextkube',
      },
      encryptedData: ciphertext,
      iv,
      tag,
      createdAt: now,
      updatedAt: now,
    };

    const existing = readStoredClusters();
    const updated = existing.filter((c) => c.id !== clusterId);
    updated.push(newRecord);
    writeStoredClusters(updated);

    return {
      success: true,
      cluster: {
        id: newRecord.id,
        name: newRecord.name,
        type: newRecord.type,
        managedType: newRecord.managedType,
        provider: newRecord.provider,
        environment: newRecord.environment,
        status: newRecord.status,
        version: newRecord.version,
        nodeCount: newRecord.nodeCount,
        fleetId: newRecord.fleetId,
        serverUrl: newRecord.serverUrl,
        labels: newRecord.labels,
        createdAt: newRecord.createdAt,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save cluster to vault.' };
  }
}

/**
 * Deletes a cluster from the vault by ID.
 */
export function deleteClusterFromVault(id: string): boolean {
  const existing = readStoredClusters();
  const filtered = existing.filter((c) => c.id !== id);
  if (filtered.length !== existing.length) {
    writeStoredClusters(filtered);
    return true;
  }
  return false;
}

/**
 * Retrieves the decrypted KubeConfig for an attached cluster by ID.
 */
export function getDecryptedKubeConfig(clusterId: string): k8s.KubeConfig | null {
  const existing = readStoredClusters();
  const target = existing.find((c) => c.id === clusterId);
  if (!target || !target.encryptedData || !target.iv || !target.tag) {
    return null;
  }

  const payload = decryptPayload(target.encryptedData, target.iv, target.tag);
  if (!payload) return null;

  try {
    const { kc } = buildKubeConfig(payload);
    return kc;
  } catch {
    return null;
  }
}

/**
 * Retrieves the raw decrypted KubeConfig YAML string for an attached cluster by ID.
 */
export function getDecryptedKubeConfigRaw(clusterId: string): string | null {
  const existing = readStoredClusters();
  const target = existing.find((c) => c.id === clusterId);
  if (!target || !target.encryptedData || !target.iv || !target.tag) {
    return null;
  }

  const payload = decryptPayload(target.encryptedData, target.iv, target.tag);
  if (!payload || !payload.kubeconfigRaw) return null;
  return payload.kubeconfigRaw;
}
