import http from 'http';
import net from 'net';
import stream from 'stream';
import { WebSocketServer, WebSocket } from 'ws';
import * as k8s from '@kubernetes/client-node';
import { getDecryptedKubeConfig, getDecryptedKubeConfigRaw } from './cluster-vault';
import { AUTH_COOKIE_NAME, verifySessionToken } from './jwt';

let _wssInstance: WebSocketServer | null = null;
let isAttached = false;

function parseCookies(header?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!header) return list;
  header.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

export function attachTerminalWebSocket(server: http.Server): void {
  if (isAttached || (server as any).__nextkubeTerminalWsAttached) {
    return;
  }
  isAttached = true;
  (server as any).__nextkubeTerminalWsAttached = true;

  const wss = new WebSocketServer({ noServer: true });
  _wssInstance = wss;

  const originalEmit = server.emit;
  server.emit = function (event: string, ...args: any[]) {
    if (event === 'upgrade') {
      const [req, socket, head] = args as [http.IncomingMessage, net.Socket, Buffer];
      const url = req.url || '';

      if (url.includes('/exec') || url.includes('/ssh') || url.includes('/shell')) {
        handleUpgrade(req, socket, head, wss);
        return true;
      }
    }
    return originalEmit.apply(this, [event, ...args] as any);
  };

  console.log('[TerminalWS] Attached interactive WebSocket terminal handler to HTTP server.');
}

async function handleUpgrade(
  req: http.IncomingMessage,
  socket: net.Socket,
  head: Buffer,
  wss: WebSocketServer
) {
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const pathname = url.pathname;

    // 1. Match Pod Exec: /api/clusters/:clusterId/pods/:namespace/:podName/exec
    const podMatch = pathname.match(/^\/api\/clusters\/([^/]+)\/pods\/([^/]+)\/([^/]+)\/exec$/);
    // 2. Match Node SSH: /api/clusters/:clusterId/nodes/:nodeName/ssh
    const nodeMatch = pathname.match(/^\/api\/clusters\/([^/]+)\/nodes\/([^/]+)\/ssh$/);
    // 3. Match Cluster Kubectl Shell: /api/clusters/:clusterId/shell
    const shellMatch = pathname.match(/^\/api\/clusters\/([^/]+)\/shell$/);

    if (!podMatch && !nodeMatch && !shellMatch) {
      socket.destroy();
      return;
    }

    // Authenticate session from HTTP cookie
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[AUTH_COOKIE_NAME];
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (clientWs) => {
      if (podMatch) {
        const [, clusterId, namespace, podName] = podMatch;
        const container = url.searchParams.get('container') || undefined;
        handlePodExecSession(clientWs, clusterId, namespace, podName, container);
      } else if (nodeMatch) {
        const [, clusterId, nodeName] = nodeMatch;
        handleNodeSession(clientWs, clusterId, nodeName);
      } else if (shellMatch) {
        const [, clusterId] = shellMatch;
        handleClusterShellSession(clientWs, clusterId);
      }
    });
  } catch (err) {
    console.error('[TerminalWS] Upgrade error:', err);
    socket.destroy();
  }
}

async function handlePodExecSession(
  clientWs: WebSocket,
  clusterId: string,
  namespace: string,
  podName: string,
  container?: string
) {
  let kc: k8s.KubeConfig | null = null;
  try {
    kc = getDecryptedKubeConfig(clusterId);
  } catch (err: any) {
    clientWs.send(`\r\n\x1b[31m[ERROR] Failed to decrypt cluster credentials: ${err.message}\x1b[0m\r\n`);
    clientWs.close();
    return;
  }

  // Fallback for default-local or local cluster ID
  if (!kc && (clusterId === 'default-local' || clusterId === 'local')) {
    try {
      const defaultKc = new k8s.KubeConfig();
      defaultKc.loadFromDefault();
      const curr = defaultKc.getCurrentCluster();
      if (curr && curr.server && curr.server !== 'http://localhost:8080') {
        kc = defaultKc;
      }
    } catch {
      // ignore local kubeconfig resolution error
    }
  }

  if (!kc) {
    clientWs.send(`\r\n\x1b[31m[ERROR] Kubernetes cluster "${clusterId}" not found in vault.\x1b[0m\r\n`);
    clientWs.close();
    return;
  }

  let resolvedContainer = container || '';

  // Auto-validate container against pod spec
  try {
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const podRes = await coreApi.readNamespacedPod({ name: podName, namespace });
    const availableContainers = (podRes.spec?.containers || []).map((c) => c.name);

    if (resolvedContainer && !availableContainers.includes(resolvedContainer)) {
      if (availableContainers.length > 0) {
        clientWs.send(
          `\x1b[33m[WARN] Container "${resolvedContainer}" does not exist in pod "${podName}". ` +
          `Falling back to container "${availableContainers[0]}".\x1b[0m\r\n`
        );
        resolvedContainer = availableContainers[0];
      }
    } else if (!resolvedContainer && availableContainers.length > 0) {
      resolvedContainer = availableContainers[0];
    }
  } catch {
    // If pod lookup fails, proceed with the specified container
  }

  const exec = new k8s.Exec(kc);
  const stdin = new stream.PassThrough();
  const stdout = new stream.PassThrough() as any;

  // Initialize terminal dimensions
  stdout.columns = 80;
  stdout.rows = 24;

  stdout.on('data', (chunk: Buffer) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(chunk.toString('utf8'));
    }
  });

  clientWs.on('message', (msg: WebSocket.RawData) => {
    const str = msg.toString();
    // Handle terminal resize events from Xterm.js FitAddon
    if (str.startsWith('{') && str.includes('"resize"')) {
      try {
        const parsed = JSON.parse(str);
        if (parsed.resize) {
          const { cols, rows } = parsed.resize;
          if (cols && rows) {
            stdout.columns = cols;
            stdout.rows = rows;
            stdout.emit('resize');
          }
          return;
        }
      } catch {
        // ignore resize parse error
      }
    }

    if (stdin && !stdin.destroyed) {
      stdin.write(msg);
    }
  });

  let k8sSocket: any = null;

  clientWs.on('close', () => {
    try {
      stdin.end();
    } catch {
      // ignore close error
    }
    try {
      if (k8sSocket && typeof k8sSocket.close === 'function') {
        k8sSocket.close();
      }
    } catch {
      // ignore socket close error
    }
  });

  // Try interactive bash or fallback to sh
  const interactiveCmd = [
    '/bin/sh',
    '-c',
    'TERM=xterm-256color; export TERM; [ -x /bin/bash ] && exec /bin/bash -i || exec /bin/sh -i',
  ];

  try {
    k8sSocket = await exec.exec(
      namespace,
      podName,
      resolvedContainer,
      interactiveCmd,
      stdout,
      stdout, // TTY shares stdout for combined output
      stdin,
      true,   // TTY interactive mode
      (status: any) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          if (status && status.status === 'Failure') {
            const msg = status.message || 'Execution failed';
            let extra = '';
            if (
              msg.includes('stat /bin/sh') ||
              msg.includes('no such file or directory') ||
              msg.includes('executable file not found')
            ) {
              extra =
                `\r\n\x1b[33m[NOTICE] Container "${resolvedContainer}" is distroless and has no shell (/bin/sh or /bin/bash).\x1b[0m\r\n` +
                `\x1b[90mThis is standard for Kubernetes control plane components (kube-apiserver, etcd, etc.).\x1b[0m\r\n` +
                `\x1b[36mTo debug distroless pods, attach an ephemeral debug container with a shell:\x1b[0m\r\n` +
                `  kubectl debug -it -n ${namespace} ${podName} --image=busybox --target=${resolvedContainer}\r\n`;
            }
            clientWs.send(`\r\n\x1b[31m[ERROR] Kubernetes API Error: ${msg}\x1b[0m\r\n${extra}`);
          } else {
            clientWs.send('\r\n\x1b[90mSession closed by remote API server.\x1b[0m\r\n');
          }
          clientWs.close();
        }
      }
    );
  } catch {
    // If complex shell invocation fails, try simple /bin/sh
    try {
      k8sSocket = await exec.exec(
        namespace,
        podName,
        resolvedContainer,
        ['/bin/sh'],
        stdout,
        stdout,
        stdin,
        true,
        (status: any) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            if (status && status.status === 'Failure') {
              clientWs.send(`\r\n\x1b[31m[ERROR] ${status.message}\x1b[0m\r\n`);
            } else {
              clientWs.send('\r\n\x1b[90mSession closed by remote API server.\x1b[0m\r\n');
            }
            clientWs.close();
          }
        }
      );
    } catch (fallbackErr: any) {
      const errorMsg = fallbackErr.message || String(fallbackErr);
      let diagnosis = '';

      if (
        errorMsg.includes('stat /bin/sh') ||
        errorMsg.includes('no such file or directory') ||
        errorMsg.includes('executable file not found')
      ) {
        diagnosis =
          `\r\n\x1b[33m[NOTICE] Container "${resolvedContainer}" does not have a shell binary (/bin/sh or /bin/bash).\x1b[0m\r\n` +
          `\x1b[90mIt is built with a minimal or distroless base image (common for kube-apiserver, etcd, etc.).\x1b[0m\r\n` +
          `\x1b[36mTo debug, launch an ephemeral debug container with a shell:\x1b[0m\r\n` +
          `  kubectl debug -it -n ${namespace} ${podName} --image=busybox --target=${resolvedContainer}\r\n`;
      }

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          `\r\n\x1b[31m[ERROR] Failed to start shell in pod "${podName}" (container: "${resolvedContainer || 'default'}"):\r\n` +
          `  ${errorMsg}\x1b[0m\r\n` +
          diagnosis
        );
        clientWs.close();
      }
    }
  }
}

function handleNodeSession(clientWs: WebSocket, clusterId: string, nodeName: string) {
  clientWs.send(
    `\r\n\x1b[33m[NOTICE] Direct host SSH access is disabled for cluster node "${nodeName}".\x1b[0m\r\n` +
    `\x1b[90mTo access host debugging tools, create a privileged container via kubectl:\x1b[0m\r\n` +
    `  \x1b[36mkubectl debug node/${nodeName} -it --image=busybox\x1b[0m\r\n\r\n`
  );
  setTimeout(() => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  }, 2000);
}

async function handleClusterShellSession(clientWs: WebSocket, clusterId: string) {
  let rawKubeconfig = getDecryptedKubeConfigRaw(clusterId);

  // If local or default-local
  if (!rawKubeconfig && (clusterId === 'default-local' || clusterId === 'local')) {
    try {
      const defaultKc = new k8s.KubeConfig();
      defaultKc.loadFromDefault();
      rawKubeconfig = defaultKc.exportConfig();
    } catch {
      // ignore local export error
    }
  }

  if (!rawKubeconfig) {
    clientWs.send(`\r\n\x1b[31m[ERROR] Kubernetes cluster "${clusterId}" not found in vault.\x1b[0m\r\n`);
    clientWs.close();
    return;
  }

  const kc = new k8s.KubeConfig();
  try {
    kc.loadFromString(rawKubeconfig);
  } catch (err: any) {
    clientWs.send(`\r\n\x1b[31m[ERROR] Invalid kubeconfig for cluster "${clusterId}": ${err.message}\x1b[0m\r\n`);
    clientWs.close();
    return;
  }

  const coreV1 = kc.makeApiClient(k8s.CoreV1Api);
  const rbacV1 = kc.makeApiClient(k8s.RbacAuthorizationV1Api);

  const podName = 'nextkube-shell';
  const namespace = 'default';
  const saName = 'nextkube-shell-sa';
  const roleBindingName = 'nextkube-shell-admin';

  clientWs.send(`\r\n\x1b[1;36m[NextKube]\x1b[0m Connecting to persistent in-cluster KubeConsole...\r\n`);
  clientWs.send(`\x1b[90mCluster: ${clusterId} | Namespace: ${namespace} | Pod: ${podName}\x1b[0m\r\n\r\n`);

  // 1. Ensure ServiceAccount & ClusterRoleBinding
  try {
    await coreV1.createNamespacedServiceAccount({
      namespace,
      body: { metadata: { name: saName, namespace } },
    });
  } catch {
    // Ignore if already exists (409)
  }

  try {
    await rbacV1.createClusterRoleBinding({
      body: {
        metadata: { name: roleBindingName },
        subjects: [{ kind: 'ServiceAccount', name: saName, namespace }],
        roleRef: { kind: 'ClusterRole', name: 'cluster-admin', apiGroup: 'rbac.authorization.k8s.io' },
      },
    });
  } catch {
    // Ignore if already exists (409)
  }

  // 2. Check if persistent pod already exists and is Running
  let podExistsAndRunning = false;
  try {
    const existing = await coreV1.readNamespacedPod({ name: podName, namespace });
    const phase = existing.status?.phase;
    if (phase === 'Running') {
      podExistsAndRunning = true;
    } else if (phase === 'Failed' || phase === 'Succeeded' || phase === 'Error') {
      try {
        await coreV1.deleteNamespacedPod({ name: podName, namespace, gracePeriodSeconds: 0 });
        await new Promise((r) => setTimeout(r, 1000));
      } catch {
        // ignore
      }
    }
  } catch {
    // Pod does not exist yet (404)
  }

  if (!podExistsAndRunning) {
    clientWs.send(`\x1b[33m⏳ Provisioning persistent KubeConsole pod "${podName}"...\x1b[0m\r\n`);
    const shellImage = process.env.NEXTKUBE_SHELL_IMAGE || 'bitnami/kubectl:latest';

    try {
      await coreV1.createNamespacedPod({
        namespace,
        body: {
          metadata: {
            name: podName,
            namespace,
            labels: {
              app: 'nextkube-shell',
              'nextkube.io/persistent': 'true',
            },
          },
          spec: {
            serviceAccountName: saName,
            restartPolicy: 'Always',
            containers: [
              {
                name: 'shell',
                image: shellImage,
                command: ['/bin/sh', '-c', 'while true; do sleep 3600; done'],
                securityContext: {
                  runAsUser: 0,
                },
                resources: {
                  requests: { cpu: '20m', memory: '32Mi' },
                  limits: { cpu: '1000m', memory: '512Mi' },
                },
              },
            ],
          },
        },
      });
    } catch (err: any) {
      if (err.statusCode !== 409) {
        clientWs.send(`\r\n\x1b[31m[ERROR] Failed to create shell pod: ${err.message}\x1b[0m\r\n`);
        clientWs.close();
        return;
      }
    }

    // Wait for pod to be Running (polling with timeout)
    let isRunning = false;
    const maxAttempts = 60; // ~30 seconds
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (clientWs.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        const pod = await coreV1.readNamespacedPod({ name: podName, namespace });
        const phase = pod.status?.phase;
        if (phase === 'Running') {
          isRunning = true;
          break;
        } else if (phase === 'Failed' || phase === 'Error') {
          clientWs.send(`\r\n\x1b[31m[ERROR] Shell pod failed with phase: ${phase}\x1b[0m\r\n`);
          clientWs.close();
          return;
        }
      } catch {
        // Pod might still be registering in API
      }

      if (attempt % 6 === 0) {
        clientWs.send(`\x1b[90mWaiting for container to start (${attempt * 500}ms)...\x1b[0m\r\n`);
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    if (!isRunning) {
      clientWs.send(`\r\n\x1b[31m[ERROR] Timed out waiting for pod "${podName}" to start.\x1b[0m\r\n`);
      clientWs.close();
      return;
    }
  }

  clientWs.send(`\x1b[32m✔ Persistent KubeConsole is Ready! Attached to ${podName}.\x1b[0m\r\n\r\n`);

  // Exec into pod
  const exec = new k8s.Exec(kc);
  const stdin = new stream.PassThrough();
  const stdout = new stream.PassThrough() as any;
  stdout.columns = 80;
  stdout.rows = 24;

  stdout.on('data', (chunk: Buffer) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(chunk.toString('utf8'));
    }
  });

  clientWs.on('message', (msg: WebSocket.RawData) => {
    const str = msg.toString();
    if (str.startsWith('{') && str.includes('"resize"')) {
      try {
        const parsed = JSON.parse(str);
        if (parsed.resize) {
          const { cols, rows } = parsed.resize;
          if (cols && rows) {
            stdout.columns = cols;
            stdout.rows = rows;
            stdout.emit('resize');
          }
          return;
        }
      } catch {
        // ignore resize error
      }
    }

    if (str.startsWith('{') && str.includes('"terminatePod"')) {
      try {
        const parsed = JSON.parse(str);
        if (parsed.terminatePod) {
          coreV1.deleteNamespacedPod({ name: podName, namespace, gracePeriodSeconds: 0 }).catch(() => {});
          clientWs.send('\r\n\x1b[33m[NextKube] Shell pod terminated.\x1b[0m\r\n');
          clientWs.close();
          return;
        }
      } catch {
        // ignore
      }
    }

    if (stdin && !stdin.destroyed) {
      stdin.write(msg);
    }
  });

  let k8sSocket: any = null;

  const cleanup = async () => {
    try {
      stdin.end();
    } catch {
      // ignore
    }
    try {
      if (k8sSocket && typeof k8sSocket.close === 'function') {
        k8sSocket.close();
      }
    } catch {
      // ignore
    }
    // We intentionally do NOT delete the pod.
    // The persistent pod remains running in the cluster so future launches connect instantly.
  };

  clientWs.on('close', cleanup);

  const initCmd = [
    '/bin/sh',
    '-c',
    `mkdir -p /usr/share/terminfo/x /usr/share/terminfo/a 2>/dev/null || true; ` +
    `ln -sf /usr/share/terminfo/l/linux /usr/share/terminfo/x/xterm 2>/dev/null || true; ` +
    `ln -sf /usr/share/terminfo/l/linux /usr/share/terminfo/x/xterm-256color 2>/dev/null || true; ` +
    `ln -sf /usr/share/terminfo/l/linux /usr/share/terminfo/a/ansi 2>/dev/null || true; ` +
    `cat << 'EOF' > /root/.bashrc
export TERM=xterm-256color
export COLORTERM=truecolor
alias k=kubectl
alias l='ls -la'
alias ll='ls -l'

# Self-contained shim for bash-completion helper functions
_get_comp_words_by_ref() {
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  words=("\${COMP_WORDS[@]}")
  cword=$COMP_CWORD
}

__kubectl_init_completion() {
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  words=("\${COMP_WORDS[@]}")
  cword=$COMP_CWORD
}

# Source kubectl completion and bind to both k and kubectl
if command -v kubectl >/dev/null 2>&1; then
  source <(kubectl completion bash 2>/dev/null) 2>/dev/null || true

  # Re-assert shims after source in case raw script redefined them
  _get_comp_words_by_ref() {
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    words=("\${COMP_WORDS[@]}")
    cword=$COMP_CWORD
  }

  __kubectl_init_completion() {
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    words=("\${COMP_WORDS[@]}")
    cword=$COMP_CWORD
  }

  complete -o default -F __start_kubectl k 2>/dev/null || true
  complete -o default -F __start_kubectl kubectl 2>/dev/null || true
fi

export PS1="\\[\\033[1;36m\\]nextkube\\[\\033[0m\\] [\\[\\033[1;32m\\]${clusterId}\\[\\033[0m\\]] \\[\\033[1;34m\\]\\w\\[\\033[0m\\] # "
EOF
cd /root;
echo -e "\\033[1;36m========================================================================\\033[0m";
echo -e "\\033[1;32m  ⚡ KubeConsole • Persistent In-Cluster Terminal\\033[0m";
echo -e "  Cluster:   \\033[1;33m${clusterId}\\033[0m";
echo -e "  Pod:       \\033[1;35m${podName}\\033[0m";
echo -e "  Isolation: \\033[1;32m100% In-Cluster Pod (Persistent Architecture)\\033[0m";
echo -e "  Pre-loaded:\\033[1;33m kubectl\\033[0m, \\033[1;33malias k=kubectl\\033[0m, \\033[1;32mTab Autocompletion enabled\\033[0m";
echo -e "\\033[1;36m========================================================================\\033[0m";
echo "";
if [ -x /bin/bash ]; then
  exec /bin/bash --rcfile /root/.bashrc -i;
else
  export PS1="nextkube [${clusterId}] \\w # ";
  alias k=kubectl;
  exec /bin/sh -i;
fi`,
  ];

  try {
    k8sSocket = await exec.exec(
      namespace,
      podName,
      'shell',
      initCmd,
      stdout,
      stdout,
      stdin,
      true,
      async (_status: any) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send('\r\n\x1b[90mSession closed by remote container.\x1b[0m\r\n');
          clientWs.close();
        }
        await cleanup();
      }
    );
  } catch (err: any) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(`\r\n\x1b[31m[ERROR] Failed to attach exec to pod: ${err.message}\x1b[0m\r\n`);
      clientWs.close();
    }
    await cleanup();
  }
}
