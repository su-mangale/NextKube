import net from 'net';
import * as k8s from '@kubernetes/client-node';
import { getClusterApiClients } from './k8s-client';
import {
  PortForwardSession,
  CreatePortForwardRequest,
  PortForwardTargetOption,
} from '@/shared/types/dashboard.types';

interface PortForwardInternal {
  session: PortForwardSession;
  server: net.Server;
  activeSockets: Set<net.Socket>;
  activeWebSockets: Set<any>;
}

// Global registry persisting across hot reloads in development
const globalRegistry = globalThis as unknown as {
  __nextkube_port_forwards?: Map<string, PortForwardInternal>;
};

if (!globalRegistry.__nextkube_port_forwards) {
  globalRegistry.__nextkube_port_forwards = new Map<string, PortForwardInternal>();
}

const sessionsMap = globalRegistry.__nextkube_port_forwards;

/**
 * Checks whether a specific TCP port is free on 0.0.0.0
 */
function testPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, '0.0.0.0');
  });
}

/**
 * Finds a guaranteed available local port
 */
async function findAvailablePort(preferredPort?: number): Promise<number> {
  if (preferredPort && preferredPort > 0 && preferredPort < 65536) {
    const isFree = await testPortAvailable(preferredPort);
    if (isFree) return preferredPort;
    throw new Error(`Preferred local port ${preferredPort} is already in use.`);
  }

  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '0.0.0.0', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
    srv.on('error', reject);
  });
}

/**
 * Start a new port-forward session
 */
export async function startPortForwardSession(
  clusterId: string,
  req: CreatePortForwardRequest
): Promise<PortForwardSession> {
  const clients = getClusterApiClients(clusterId);
  if (!clients || !clients.kc) {
    throw new Error(`Cluster "${clusterId}" is not connected or credentials not found.`);
  }

  const namespace = req.namespace || 'default';
  const targetType = req.targetType || 'pod';
  const targetName = req.targetName?.trim();
  const targetPort = Number(req.targetPort);

  if (!targetName) throw new Error('Target resource name is required.');
  if (!targetPort || isNaN(targetPort) || targetPort <= 0 || targetPort > 65535) {
    throw new Error(`Invalid target port: ${req.targetPort}`);
  }

  // 1. Allocate free local port
  const localPort = await findAvailablePort(req.localPort);
  const sessionId = `pf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 2. Build session state
  const session: PortForwardSession = {
    id: sessionId,
    clusterId,
    namespace,
    targetType,
    targetName,
    targetPort,
    localPort,
    status: 'active',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    connectionsCount: 0,
    bytesReceived: 0,
    bytesSent: 0,
    url: `http://localhost:${localPort}`,
    proxyUrl: `/api/clusters/${clusterId}/proxy/${sessionId}/`,
  };

  const activeSockets = new Set<net.Socket>();
  const activeWebSockets = new Set<any>();

  // 3. Create TCP forwarding server
  const server = net.createServer(async (socket) => {
    activeSockets.add(socket);
    session.connectionsCount++;
    session.lastActive = new Date().toISOString();

    let wsConnection: any = null;

    try {
      const forwarder = new k8s.PortForward(clients.kc);

      // Intercept write to track inbound bytes transferred from pod to socket
      const originalWrite = socket.write.bind(socket);
      socket.write = (chunk: any, encoding?: any, cb?: any) => {
        if (chunk) {
          session.bytesReceived += chunk.length || 0;
          session.lastActive = new Date().toISOString();
        }
        return originalWrite(chunk, encoding, cb);
      };

      // Intercept incoming data from socket to pod
      socket.on('data', (chunk) => {
        session.bytesSent += chunk.length || 0;
        session.lastActive = new Date().toISOString();
      });

      if (targetType === 'pod') {
        wsConnection = await forwarder.portForward(
          namespace,
          targetName,
          [targetPort],
          socket,
          null,
          socket,
          0
        );
      } else {
        // Service port forward
        wsConnection = await forwarder.portForwardService(
          namespace,
          targetName,
          [targetPort],
          socket,
          null,
          socket,
          0
        );
      }

      if (wsConnection) {
        activeWebSockets.add(wsConnection);
      }
    } catch (err: any) {
      console.error(`[PortForward] Socket tunnel error for ${sessionId}:`, err);
      socket.destroy();
    }

    const cleanupSocket = () => {
      activeSockets.delete(socket);
      if (wsConnection) {
        activeWebSockets.delete(wsConnection);
        try {
          if (typeof wsConnection.close === 'function') wsConnection.close();
        } catch {
          // ignore close error
        }
      }
    };

    socket.on('close', cleanupSocket);
    socket.on('error', (err) => {
      console.warn(`[PortForward] Client socket error on port ${localPort}:`, err.message);
      cleanupSocket();
    });
  });

  server.on('error', (err: any) => {
    console.error(`[PortForward] Server error on local port ${localPort}:`, err);
    session.status = 'error';
    session.errorMessage = err.message || 'Port-forward server failure';
  });

  // Start listening on 0.0.0.0
  await new Promise<void>((resolve, reject) => {
    server.listen(localPort, '0.0.0.0', () => {
      resolve();
    });
    server.once('error', reject);
  });

  const internal: PortForwardInternal = {
    session,
    server,
    activeSockets,
    activeWebSockets,
  };

  sessionsMap.set(sessionId, internal);
  return session;
}

/**
 * Stop an active port-forward session
 */
export async function stopPortForwardSession(sessionId: string): Promise<boolean> {
  const internal = sessionsMap.get(sessionId);
  if (!internal) return false;

  // 1. Destroy active TCP client sockets
  internal.activeSockets.forEach((sock) => {
    try {
      sock.destroy();
    } catch {
      // ignore error
    }
  });
  internal.activeSockets.clear();

  // 2. Close active WebSockets
  internal.activeWebSockets.forEach((ws) => {
    try {
      if (typeof ws.close === 'function') ws.close();
    } catch {
      // ignore error
    }
  });
  internal.activeWebSockets.clear();

  // 3. Close TCP server
  await new Promise<void>((resolve) => {
    internal.server.close(() => resolve());
  });

  internal.session.status = 'stopped';
  sessionsMap.delete(sessionId);
  return true;
}

/**
 * List all active port-forward sessions for a cluster
 */
export function listPortForwardSessions(clusterId?: string): PortForwardSession[] {
  const result: PortForwardSession[] = [];
  sessionsMap.forEach((internal) => {
    if (!clusterId || internal.session.clusterId === clusterId) {
      result.push({ ...internal.session });
    }
  });
  return result;
}

/**
 * Get a specific port-forward session
 */
export function getPortForwardSession(sessionId: string): PortForwardSession | undefined {
  const internal = sessionsMap.get(sessionId);
  return internal ? { ...internal.session } : undefined;
}

/**
 * Fetch possible port forward targets (Pods and Services) in a namespace
 */
export async function fetchPortForwardTargets(
  clusterId: string,
  namespace: string = 'default'
): Promise<PortForwardTargetOption[]> {
  const clients = getClusterApiClients(clusterId);
  if (!clients || !clients.coreApi) return [];

  const targets: PortForwardTargetOption[] = [];

  try {
    // 1. Fetch Pods
    const podsRes =
      namespace === 'all'
        ? await clients.coreApi.listPodForAllNamespaces()
        : await clients.coreApi.listNamespacedPod({ namespace });

    (podsRes.items || []).forEach((pod) => {
      const name = pod.metadata?.name;
      if (!name) return;

      const ports: number[] = [];
      (pod.spec?.containers || []).forEach((c) => {
        (c.ports || []).forEach((p) => {
          if (p.containerPort && !ports.includes(p.containerPort)) {
            ports.push(p.containerPort);
          }
        });
      });

      // If no explicit container ports declared, provide common HTTP/DB fallback ports
      if (ports.length === 0) {
        ports.push(80, 8080);
      }

      targets.push({
        name,
        type: 'pod',
        namespace: pod.metadata?.namespace || namespace,
        ports,
        status: pod.status?.phase || 'Unknown',
      });
    });

    // 2. Fetch Services
    const svcRes =
      namespace === 'all'
        ? await clients.coreApi.listServiceForAllNamespaces()
        : await clients.coreApi.listNamespacedService({ namespace });

    (svcRes.items || []).forEach((svc) => {
      const name = svc.metadata?.name;
      if (!name) return;

      const ports: number[] = [];
      (svc.spec?.ports || []).forEach((p) => {
        if (p.port && !ports.includes(p.port)) {
          ports.push(p.port);
        }
      });

      if (ports.length === 0) ports.push(80);

      targets.push({
        name,
        type: 'service',
        namespace: svc.metadata?.namespace || namespace,
        ports,
        status: svc.spec?.type || 'ClusterIP',
      });
    });
  } catch (err) {
    console.warn('[PortForward] Failed to list targets:', err);
  }

  return targets;
}
