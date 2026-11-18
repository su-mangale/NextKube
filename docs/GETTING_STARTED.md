# Getting Started with NextKube

Follow this guide to get NextKube up and running locally or against an existing Kubernetes cluster.

---

## 📋 Prerequisites

- **Node.js**: `v20.x` or `v24.x` (LTS recommended)
- **Package Manager**: `npm` `v10+`
- **Kubernetes Access**:
  - Local cluster: [Kind](https://kind.sigs.k8s.io/), [Minikube](https://minikube.sigs.k8s.io/), or Docker Desktop Kubernetes.
  - Remote cluster: Kubeconfig with cluster admin or operator permissions.

---

## ⚡ Quick Start (Local Development)

### 1. Clone & Install

```bash
git clone https://github.com/su-mangale/NextKube.git
cd NextKube
npm install
```

### 2. Configure Environment

Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

Example `.env.local`:
```env
# Port on which NextKube serves traffic
PORT=3000

# NextKube Vault & Authentication Secrets (at least 32 characters)
NEXTKUBE_AUTH_SECRET="nextkube-super-secure-jwt-auth-secret-32chars!"
NEXTKUBE_ENCRYPTION_KEY="nextkube-default-cluster-vault-secret-key-32chars!"

# Optional backend proxy URL (defaults to standalone server if omitted)
NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3000"
```

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and log in with the default admin account:
- **Username**: `admin`
- **Default Password**: (as configured in `.nextkube/users.json` or created on first startup)

---

## ☸️ Connecting a Kubernetes Cluster

### Option A: Automatic Local Detection
If you are running **Kind** or **Minikube** on your local machine with `~/.kube/config` populated, NextKube will detect your local clusters and display them automatically on the clusters dashboard.

### Option B: Uploading Kubeconfig
1. Open the **Clusters** dashboard.
2. Click **Connect Cluster**.
3. Paste or upload your `kubeconfig` YAML file.
4. NextKube automatically encrypts the kubeconfig with **AES-256-GCM** and stores it in `.nextkube/clusters.json`.

---

## 🧪 Validating the Build Locally

To run the complete quality gate and production build verification:

```bash
# 1. Run ESLint Quality Check
npm run lint

# 2. Verify TypeScript Types
npx tsc --noEmit

# 3. Compile Production Next.js Standalone Build
npm run build
```
