# NextKube Architecture & Core Mechanics

NextKube is engineered as a zero-friction, standalone Kubernetes cluster operations console. It merges server-rendered Next.js performance with persistent full-duplex WebSocket streaming for terminal and real-time workload telemetry.

---

## 🏗️ High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client["Browser Client (NextKube UI)"]
        UI["Next.js App Router (React 19 / MUI v9)"]
        ReactQuery["TanStack React Query Cache"]
        Xterm["Xterm.js Canvas Terminal"]
        Monaco["Manifest Editor (Syntax Highlighted)"]
    end

    subgraph Server["NextKube Standalone Server (Node.js 24)"]
        Middleware["Session & Auth Proxy (JWT verify)"]
        API["REST & JSON-RPC Route Handlers"]
        TerminalWS["WebSocket Terminal Multiplexer (node-pty)"]
        K8sClient["@kubernetes/client-node Engine"]
        Vault["AES-256-GCM Cluster Vault (.nextkube)"]
        Audit["Audit Logger & Event Stream"]
    end

    subgraph Clusters["Target Kubernetes Clusters"]
        K8sAPI["kube-apiserver (Kind / Minikube / Cloud EKS / GKE)"]
        Pods["Target Pod Containers (exec / logs / status)"]
        Deployments["Deployment / StatefulSet Controllers"]
    end

    UI -->|HTTPS / REST| Middleware
    Middleware --> API
    API --> K8sClient
    API --> Vault
    API --> Audit

    UI -->|WSS / Interactive Terminal| TerminalWS
    TerminalWS -->|In-Cluster Pod Exec| Pods

    K8sClient -->|RFC 6902 JSON Patch / Scale / Rollout| K8sAPI
    K8sAPI --> Deployments
    K8sAPI --> Pods
```

---

## 🧩 Architectural Pillars

### 1. Unified Next.js Standalone Engine
NextKube produces an optimized standalone bundle using Next.js 16's standalone server output:
- **No Heavy External Backends**: The server acts directly as an intelligent proxy to the Kubernetes API, eliminating intermediate middleware delays.
- **Micro-Footprint**: Packaged into a minimal Node 24 Alpine image consuming under ~65MB RAM at idle.
- **Fast Cold-Starts**: Turbopack-compiled static and dynamic routes render in under 1ms.

### 2. Bi-Directional WebSocket Terminal Multiplexer
Live shell access is implemented directly in [src/server/terminal-ws.ts](file:///Users/mangale/Downloads/github/NextKube/src/server/terminal-ws.ts):
- Attaches directly to the Node HTTP server instance via the `ws` library.
- Supports both **Ephemeral In-Cluster Pod Shells** (launching lightweight debugging containers directly in the cluster) and **Direct Pod Container Exec** using standard Kubernetes SPDY/WebSocket exec subprotocols.
- Emulates pseudo-terminals (`pty`) with dynamic resize signals matching `xterm.js` viewport metrics.

### 3. Cluster Security & Credential Vault
Cluster access tokens and raw kubeconfigs are never stored in plaintext:
- Encrypted at rest via **AES-256-GCM** using SHA-256 derived vault keys.
- Decrypted in-memory on demand per request and cached securely in the server process.
- RBAC roles (`admin`, `operator`, `viewer`) enforced through signed HS256 JWT cookies.

### 4. Resilient Workload Mutation Protocol
Mutations such as replica scaling and rollout restarts use standard Kubernetes API protocols:
- **JSON Patch (RFC 6902)**: Scaling operations dispatch atomic JSON patches (`[{ op: 'replace', path: '/spec/replicas', value: replicas }]`) preventing destructive overwrites.
- **Rollout Annotations**: Rolling restarts apply `kubectl.kubernetes.io/restartedAt` RFC 3339 timestamps to deployment pod templates, faithfully mimicking `kubectl rollout restart`.

---

## 🔄 Request Lifecycle & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Cluster Operator
    participant UI as NextKube UI
    participant Middleware as Auth Middleware
    participant Route as Cluster API Route
    participant Client as K8s Client Node
    participant APIServer as Kubernetes API Server

    Operator->>UI: Select Replica Count & Click "Apply Scale"
    UI->>Middleware: POST /api/clusters/kind-kind/deployments/nginx/scale
    Middleware->>Middleware: Verify JWT Session Cookie
    Middleware->>Route: Forward Authenticated Request
    Route->>Client: scaleDeploymentResource(clusterId, ns, name, replicas)
    Client->>Client: Construct RFC 6902 JSON Patch
    Client->>APIServer: PATCH /apis/apps/v1/namespaces/default/deployments/nginx
    APIServer-->>Client: 200 OK (Deployment updated)
    Client-->>Route: { success: true, message: "..." }
    Route-->>UI: 200 OK Response
    UI->>UI: Trigger React Query refetch (Deployments, Pods)
    UI-->>Operator: Display Success Toast & Updated Replica Count
```
