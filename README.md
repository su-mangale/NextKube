# NextKube ☸️🚀

> **High-Performance Standalone Kubernetes Cluster Operations & Management Console**  
> *Built with Next.js 16 (App Router), React 19, TypeScript, and Material-UI v9.*

[![CI/CD Build](https://github.com/su-mangale/NextKube/actions/workflows/build-nextkube.yml/badge.svg)](https://github.com/su-mangale/NextKube/actions/workflows/build-nextkube.yml)
[![Docker Image](https://img.shields.io/badge/docker%20image-ghcr.io-blue?logo=docker)](https://github.com/su-mangale/NextKube/pkgs/container/nextkube)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Client%20v2-326CE5?logo=kubernetes)](https://kubernetes.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 What is NextKube?

**NextKube** is an operator-first, modern web console designed to make day-to-day Kubernetes operations fast, visual, and secure. Unlike bloated legacy dashboards that require heavy in-cluster agents and complex ingress setups, NextKube operates as a **zero-dependency standalone engine**:
- It connects directly to your Kubernetes API servers (Kind, Minikube, or cloud-hosted EKS/GKE/AKS).
- Provides live workload telemetry, crash anomaly detection, and interactive container terminal execution right in your browser.
- Encrypts cluster access credentials at rest with **AES-256-GCM**, safeguarding your clusters.

---

## 📸 Visual Showcase

### 1. Cluster Operations & Anomaly Detection Dashboard
Real-time visibility into pod readiness, deployment states, node availability, and automated crash-loop anomaly detection:
![Cluster Overview](docs/images/01-cluster-overview.png)

### 2. Workload Management & Direct Row Actions
Seamless pod inspection with inline action buttons for live logs, interactive terminal exec, and pod lifecycle restarts:
![Pods Management](docs/images/02-pods-management.png)

### 3. Deployments & Workload Scaling
Inspect replica readiness across your clusters with atomic replica scaling and rolling update controls:
![Deployments Management](docs/images/03-deployments-scale.png)

### 4. Interactive Replica Scaling Slider
Scale Deployments, StatefulSets, and ReplicaSets with RFC 6902 JSON patch guarantees:
![Scale Dialog](docs/images/04-scale-dialog.png)

### 5. In-Browser YAML Manifest IDE
Edit, validate, and apply Kubernetes YAML and JSON manifests directly from the floating dock:
![YAML Manifest Editor](docs/images/05-yaml-manifest-editor.png)

### 6. Liquid Glassmorphic ActionDock & System Preferences
Persistent theme toggling (Dark & Light modes) and multi-session window management:
![System Settings](docs/images/06-system-settings.png)

### 7. Secure Operator Authentication Portal
Enterprise login protected by signed JWT session tokens:
![Login Screen](docs/images/07-login-screen.png)

---

## 🏗️ How NextKube Works

NextKube combines a server-rendered Next.js frontend with an intelligent backend proxy that interfaces directly with your Kubernetes API servers and container runtimes.

```mermaid
flowchart TD
    subgraph Browser["Operator Browser"]
        Dashboard["NextKube Web Console (Next.js 16 / React 19)"]
        Dock["Floating ActionDock (Shell, YAML, Settings)"]
        Terminal["Xterm.js Canvas Shell"]
    end

    subgraph Server["NextKube Standalone Container"]
        AuthMiddleware["JWT Session Middleware"]
        ClusterVault["AES-256-GCM Vault (.nextkube)"]
        K8sEngine["@kubernetes/client-node Engine"]
        WSServer["WebSocket Terminal Multiplexer (node-pty)"]
    end

    subgraph Cluster["Kubernetes Control Plane"]
        APIServer["kube-apiserver"]
        Workloads["Pods / Deployments / StatefulSets"]
        KubeExec["SPDY / WebSocket Container Exec"]
    end

    Dashboard -->|HTTPS / REST| AuthMiddleware
    AuthMiddleware --> K8sEngine
    K8sEngine --> ClusterVault
    K8sEngine -->|RFC 6902 JSON Patch| APIServer
    APIServer --> Workloads

    Terminal -->|WSS / Interactive Terminal| WSServer
    WSServer -->|Container Exec| KubeExec
```

---

## 📚 Detailed Documentation

Explore dedicated, in-depth documentation in the [`docs/`](docs/) directory:

| Section | Document | Description |
|---|---|---|
| **Architecture** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | High-level system design, data flow diagrams, request lifecycles, and technical decisions. |
| **Features** | [docs/FEATURES.md](docs/FEATURES.md) | Comprehensive walkthrough of all 17+ resource types, logs streaming, and workload controls. |
| **Getting Started** | [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Step-by-step installation, local development guide, environment variables, and Kind/Minikube setup. |
| **Docker & Deployment** | [docs/DOCKER_AND_DEPLOYMENT.md](docs/DOCKER_AND_DEPLOYMENT.md) | Multi-stage Docker builds, GitHub Actions CI/CD workflows, FluxCD GitOps tagging, and K8s manifests. |
| **Security & RBAC** | [docs/SECURITY_AND_RBAC.md](docs/SECURITY_AND_RBAC.md) | AES-256-GCM encryption, JWT sessions, role privileges, and automated audit trails. |

---

## ⚡ Quick Start

### 1. Run with Node.js
```bash
# Clone the repository
git clone https://github.com/su-mangale/NextKube.git
cd NextKube

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Run with Docker
```bash
# Run latest pre-built container from GitHub Container Registry
docker run -d --name nextkube \
  -p 3000:3000 \
  ghcr.io/su-mangale/nextkube:latest
```

Open [http://localhost:3000](http://localhost:3000) and log in with operator username `admin`.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (Turbopack, App Router, Standalone output)
- **Library**: [React 19](https://react.dev/)
- **UI Components**: [Material-UI v9 (MUI)](https://mui.com/) & [Emotion](https://emotion.sh/)
- **State & Data Sync**: [TanStack React Query v5](https://tanstack.com/query/latest)
- **Terminal Emulator**: [Xterm.js v6](https://xtermjs.org/) with `@xterm/addon-fit`
- **Native Terminal PTY**: [node-pty](https://github.com/microsoft/node-pty)
- **Kubernetes Client**: [@kubernetes/client-node v2](https://github.com/kubernetes-client/javascript)
- **Security & Crypto**: [jose (JWT)](https://github.com/panva/jose) & Node crypto (AES-256-GCM)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
