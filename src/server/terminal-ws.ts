import http from 'http';
import net from 'net';
import stream from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import * as k8s from '@kubernetes/client-node';
import { getDecryptedKubeConfig, getDecryptedKubeConfigRaw } from './cluster-vault';
import { AUTH_COOKIE_NAME, verifySessionToken } from './jwt';

let wssInstance: WebSocketServer | null = null;
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
  wssInstance = wss;

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
    } catch {}
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
  } catch (err: any) {
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
      } catch {}
    }

    if (stdin && !stdin.destroyed) {
      stdin.write(msg);
    }
  });

  let k8sSocket: any = null;

  clientWs.on('close', () => {
    try {
      stdin.end();
    } catch {}
    try {
      if (k8sSocket && typeof k8sSocket.close === 'function') {
        k8sSocket.close();
      }
    } catch {}
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
  } catch (firstErr: any) {
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
    } catch {}
  }

  if (!rawKubeconfig) {
    clientWs.send(`\r\n\x1b[31m[ERROR] Kubernetes cluster "${clusterId}" not found in vault.\x1b[0m\r\n`);
    clientWs.close();
    return;
  }

  const pty = require('node-pty');
  const tempDir = os.tmpdir();
  const sessionId = crypto.randomBytes(8).toString('hex');
  const tempKubeconfigPath = path.join(tempDir, `nextkube-${clusterId}-${sessionId}.yaml`);
  const tempRcPath = path.join(tempDir, `nextkube-rc-${sessionId}.sh`);
  const tempWorkspaceDir = path.join(tempDir, `nextkube-workspace-${sessionId}`);
  fs.mkdirSync(tempWorkspaceDir, { recursive: true });

  fs.writeFileSync(tempKubeconfigPath, rawKubeconfig, { mode: 0o600 });

  const isDarwin = process.platform === 'darwin';
  const shellBinary = isDarwin ? '/bin/zsh' : (fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh');

  // Prepare environment RC script with autocomplete and alias
  const rcScript = isDarwin
    ? `export KUBECONFIG="${tempKubeconfigPath}"
export CLUSTER="${clusterId}"
export HOME="${tempWorkspaceDir}"
export TERM=xterm-256color
export COLORTERM=truecolor
cd "${tempWorkspaceDir}"
autoload -Uz compinit && compinit -C 2>/dev/null || true
if command -v kubectl >/dev/null 2>&1; then
  source <(kubectl completion zsh 2>/dev/null) 2>/dev/null || true
  alias k=kubectl
  compdef __start_kubectl k 2>/dev/null || true
fi
export PS1="%F{cyan}nextkube%f [%F{green}${clusterId}%f] %F{blue}workspace%f $ "
clear
echo -e "\\033[1;36m========================================================================\\033[0m"
echo -e "\\033[1;32m  NextKube Interactive Kubectl Shell\\033[0m"
echo -e "  Cluster: \\033[1;33m${clusterId}\\033[0m"
echo -e "  Sandbox: \\033[1;35mIsolated Workspace\\033[0m"
echo -e "  Pre-loaded: \\033[1;35mkubectl\\033[0m, \\033[1;35malias k=kubectl\\033[0m, \\033[1;32mTab Autocompletion\\033[0m"
echo -e "\\033[1;36m========================================================================\\033[0m"
echo ""
`
    : `export KUBECONFIG="${tempKubeconfigPath}"
export CLUSTER="${clusterId}"
export HOME="${tempWorkspaceDir}"
export TERM=xterm-256color
export COLORTERM=truecolor
cd "${tempWorkspaceDir}"
if [ -f /usr/share/bash-completion/bash_completion ]; then
  . /usr/share/bash-completion/bash_completion 2>/dev/null || true
elif [ -f /etc/bash_completion ]; then
  . /etc/bash_completion 2>/dev/null || true
fi
if command -v kubectl >/dev/null 2>&1; then
  source <(kubectl completion bash 2>/dev/null) 2>/dev/null || true
  alias k=kubectl
  complete -o default -F __start_kubectl k 2>/dev/null || true
fi
export PS1="\\[\\033[1;36m\\]nextkube\\[\\033[0m\\] [\\[\\033[1;32m\\]${clusterId}\\[\\033[0m\\]] \\[\\033[1;34m\\]workspace\\[\\033[0m\\] $ "
clear
echo -e "\\033[1;36m========================================================================\\033[0m"
echo -e "\\033[1;32m  NextKube Interactive Kubectl Shell\\033[0m"
echo -e "  Cluster: \\033[1;33m${clusterId}\\033[0m"
echo -e "  Sandbox: \\033[1;35mIsolated Workspace\\033[0m"
echo -e "  Pre-loaded: \\033[1;35mkubectl\\033[0m, \\033[1;35malias k=kubectl\\033[0m, \\033[1;32mTab Autocompletion\\033[0m"
echo -e "\\033[1;36m========================================================================\\033[0m"
echo ""
`;

  fs.writeFileSync(tempRcPath, rcScript, { mode: 0o600 });

  let ptyProcess: any = null;
  try {
    ptyProcess = pty.spawn(shellBinary, ['-i'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: tempWorkspaceDir,
      env: {
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        USER: 'operator',
        HOME: tempWorkspaceDir,
        KUBECONFIG: tempKubeconfigPath,
      },
    });
  } catch (spawnErr: any) {
    clientWs.send(`\r\n\x1b[31m[ERROR] Failed to spawn pseudo-terminal: ${spawnErr.message}\x1b[0m\r\n`);
    clientWs.close();
    try { fs.unlinkSync(tempKubeconfigPath); } catch {}
    try { fs.unlinkSync(tempRcPath); } catch {}
    try { fs.rmSync(tempWorkspaceDir, { recursive: true, force: true }); } catch {}
    return;
  }

  ptyProcess.onData((data: string) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });

  // Execute RC script on start
  ptyProcess.write(`. "${tempRcPath}"\r`);

  clientWs.on('message', (msg: WebSocket.RawData) => {
    const str = msg.toString();
    if (str.startsWith('{') && str.includes('"resize"')) {
      try {
        const parsed = JSON.parse(str);
        if (parsed.resize && ptyProcess) {
          const { cols, rows } = parsed.resize;
          if (cols && rows) {
            ptyProcess.resize(cols, rows);
          }
          return;
        }
      } catch {}
    }

    if (ptyProcess) {
      ptyProcess.write(msg.toString());
    }
  });

  const cleanup = () => {
    try { ptyProcess?.kill(); } catch {}
    try { fs.unlinkSync(tempKubeconfigPath); } catch {}
    try { fs.unlinkSync(tempRcPath); } catch {}
    try { fs.rmSync(tempWorkspaceDir, { recursive: true, force: true }); } catch {}
  };

  ptyProcess.onExit(() => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send('\r\n\x1b[90mSession closed.\x1b[0m\r\n');
      clientWs.close();
    }
    cleanup();
  });

  clientWs.on('close', cleanup);
}
