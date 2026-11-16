# NextKube 🚀

**NextKube** is a high-performance, standalone Kubernetes cluster operations and management dashboard built with Next.js 16, React 19, TypeScript, and Material-UI.

It provides a unified, responsive interface for cluster operators, platform engineers, and developers to inspect, manage, and operate Kubernetes workloads with real-time feedback.

---

## ✨ Features

- **Multi-Resource Inspection & Management**:
  - Comprehensive resource explorer across 17+ Kubernetes API resource types:
    - **Workloads**: Pods, Deployments, DaemonSets, StatefulSets, ReplicaSets, Jobs, CronJobs
    - **Networking**: Services, Ingresses, NetworkPolicies
    - **Config & Storage**: ConfigMaps, Secrets (with live base64 toggle decoding), PVCs, StorageClasses
    - **Cluster & Security**: Nodes, ServiceAccounts, Roles, RoleBindings, CRDs, Events
- **Interactive In-Browser Terminal**:
  - WebSocket-powered live shell terminal (`xterm.js`) supporting container `exec` into Pods and SSH into Nodes.
- **In-App YAML IDE & Validator**:
  - Dark-themed YAML manifest viewer & editor with syntax highlighting, search, line numbers, manifest diffing, clipboard export, and direct `kubectl apply` capabilities.
- **Workload Lifecycle Operations**:
  - Instant replica scaling (slider & number controls).
  - Rolling restarts and rollout history inspections with one-click revision rollback.
  - Container image tag updates.
  - Streaming pod & deployment logs with local/UTC timestamp toggles, timeframe filters, and log keyword searching.
- **Kubeconfig Export**:
  - One-click generated kubeconfig download for authenticated cluster access.
- **Modern UI & Theming**:
  - Built with Material-UI (MUI v9) with light and dark mode toggling, persistent user preferences, and zero hydration flashes.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, standalone server output)
- **Library**: [React 19](https://react.dev/)
- **UI & Styling**: [Material-UI (MUI v9)](https://mui.com/), [Emotion](https://emotion.sh/)
- **State & Data Fetching**: [TanStack React Query v5](https://tanstack.com/query/latest)
- **Terminal Emulator**: [Xterm.js v6](https://xtermjs.org/) with Fit addon
- **YAML Engine**: [js-yaml](https://github.com/nodeca/js-yaml)

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v20+` or `v24+`
- npm `v10+`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/su-mangale/NextKube.git
   cd NextKube
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file (or copy `.env.example`):
   ```bash
   cp .env.example .env.local
   ```
   Set `NEXT_PUBLIC_BACKEND_URL` and `BACKEND_URL` to point to your Kubernetes platform backend API:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
   BACKEND_URL=http://localhost:8080
   PORT=3000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Deployment

NextKube includes an optimized multi-stage `Dockerfile`:

### Build the Image:
```bash
docker build -t nextkube:latest .
```

### Run the Container:
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_BACKEND_URL="http://your-k8s-api:8080" \
  -e BACKEND_URL="http://your-k8s-api:8080" \
  nextkube:latest
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
