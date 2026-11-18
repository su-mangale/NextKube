import * as k8s from '@kubernetes/client-node';
import fs from 'fs';

const SECRET_NAME = process.env.NEXTKUBE_VAULT_SECRET || 'nextkube-vault';

/**
 * Automatically discovers the namespace where NextKube is executing.
 * Follows in-cluster ServiceAccount mount -> env vars -> fallback.
 */
export function getVaultNamespace(): string {
  if (process.env.POD_NAMESPACE) return process.env.POD_NAMESPACE;
  if (process.env.NEXTKUBE_NAMESPACE) return process.env.NEXTKUBE_NAMESPACE;
  try {
    const saNamespacePath = '/var/run/secrets/kubernetes.io/serviceaccount/namespace';
    if (fs.existsSync(saNamespacePath)) {
      const ns = fs.readFileSync(saNamespacePath, 'utf8').trim();
      if (ns) return ns;
    }
  } catch {
    // ignore
  }
  return 'nextkube-system';
}

function getCoreApi(): { api: k8s.CoreV1Api; namespace: string } | null {
  try {
    const kc = new k8s.KubeConfig();
    const isInsideCluster = fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount/token');
    if (isInsideCluster) {
      kc.loadFromCluster();
    } else {
      kc.loadFromDefault();
    }
    const current = kc.getCurrentCluster();
    if (!current || !current.server) {
      return null;
    }
    if (current.server.startsWith('http://')) {
      (current as any).skipTLSVerify = true;
    }
    return {
      api: kc.makeApiClient(k8s.CoreV1Api),
      namespace: getVaultNamespace(),
    };
  } catch {
    return null;
  }
}

/**
 * Reads a key (e.g. 'clusters.json' or 'users.json') from the nextkube-vault Kubernetes Secret.
 */
export async function readKubeSecretKey(key: string): Promise<string | null> {
  const client = getCoreApi();
  if (!client) return null;

  try {
    const secret = await client.api.readNamespacedSecret({
      name: SECRET_NAME,
      namespace: client.namespace,
    });
    if (secret && secret.data && secret.data[key]) {
      return Buffer.from(secret.data[key], 'base64').toString('utf8');
    }
    return null;
  } catch (err: any) {
    const status = err?.response?.statusCode || err?.status || err?.statusCode;
    if (process.env.DEBUG_VAULT && status !== 404) {
      console.warn(`[K8sSecretVault] Could not read ${SECRET_NAME}/${key}:`, err?.message || err);
    }
    return null;
  }
}

/**
 * Writes or patches a key in the nextkube-vault Kubernetes Secret.
 * Creates the Secret if it does not already exist.
 */
export async function writeKubeSecretKey(key: string, value: string): Promise<boolean> {
  const client = getCoreApi();
  if (!client) return false;

  const encoded = Buffer.from(value, 'utf8').toString('base64');

  try {
    let existingSecret: k8s.V1Secret | null = null;
    try {
      existingSecret = await client.api.readNamespacedSecret({
        name: SECRET_NAME,
        namespace: client.namespace,
      });
    } catch {
      existingSecret = null;
    }

    if (existingSecret) {
      const data = existingSecret.data || {};
      data[key] = encoded;
      await client.api.replaceNamespacedSecret({
        name: SECRET_NAME,
        namespace: client.namespace,
        body: {
          ...existingSecret,
          data,
        },
      });
    } else {
      await client.api.createNamespacedSecret({
        namespace: client.namespace,
        body: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: SECRET_NAME,
            namespace: client.namespace,
            labels: {
              'app.kubernetes.io/name': 'nextkube',
              'app.kubernetes.io/component': 'vault',
            },
          },
          type: 'Opaque',
          data: {
            [key]: encoded,
          },
        },
      });
    }
    return true;
  } catch (err: any) {
    console.warn(`[K8sSecretVault] Could not write ${SECRET_NAME}/${key}:`, err?.message || err);
    return false;
  }
}
