export interface CatalogAppItem {
  id: string;
  name: string;
  category: 'core' | 'observability' | 'gitops' | 'security' | 'storage';
  description: string;
  version: string;
  publisher: string;
  isVerified: boolean;
  iconColor: string;
  iconUrl?: string;
  defaultNs: string;
  defaultHost?: string;
  hasIngress?: boolean;
  hasStorage?: boolean;
  hasDashboard?: boolean;
  getDashboardUrl?: (clusterId: string) => string;
  dependencies?: string[];
}

export const CATALOG_APPS: CatalogAppItem[] = [
  // 1. Core Components
  {
    id: 'traefik',
    name: 'Traefik',
    category: 'core',
    description: 'Core Ingress router & Gateway API provider mapped to hostPort 80/443 with ingress-ready nodeSelector.',
    version: 'v34.5.0',
    publisher: 'Traefik Labs',
    isVerified: true,
    iconColor: '#24c1e0',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/traefik-proxy.svg',
    defaultNs: 'traefik',
    defaultHost: 'traefik.localhost',
    hasIngress: false,
    hasDashboard: true,
    getDashboardUrl: () => 'http://traefik.localhost',
  },
  {
    id: 'flux-operator',
    name: 'Flux Operator',
    category: 'core',
    description: 'Enterprise management operator for Flux CD instances, ResourceSets, and Flux Status Web UI.',
    version: '0.58.1',
    publisher: 'ControlPlane / FluxCD',
    isVerified: true,
    iconColor: '#326ce5',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/flux-operator.svg',
    defaultNs: 'flux-system',
    defaultHost: 'flux.localhost',
    hasIngress: true,
    hasDashboard: true,
    getDashboardUrl: () => 'http://flux.localhost',
  },
  {
    id: 'cert-manager',
    name: 'Cert Manager',
    category: 'core',
    description: "Automated X.509 certificate issuance and renewal with Let's Encrypt and internal CA integration.",
    version: 'v1.17.1',
    publisher: 'Jetstack / CNCF',
    isVerified: true,
    iconColor: '#1d5987',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/cert-manager.svg',
    defaultNs: 'cert-manager',
  },
  {
    id: 'metrics-server',
    name: 'Metrics Server',
    category: 'core',
    description: 'Core cluster resource metrics pipeline enabling kubectl top and Horizontal Pod Autoscaling (HPA).',
    version: 'v3.12.2',
    publisher: 'Kubernetes SIGs',
    isVerified: true,
    iconColor: '#326ce5',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/kubernetes.svg',
    defaultNs: 'kube-system',
  },
  {
    id: 'fluxcd-engine',
    name: 'FluxCD Engine',
    category: 'core',
    description: 'Declarative continuous delivery and GitOps sync engine underpinning the YKP control plane.',
    version: 'v2.14.0',
    publisher: 'Flux Project / CNCF',
    isVerified: true,
    iconColor: '#ec4899',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/flux-cd.svg',
    defaultNs: 'flux-system',
  },
  {
    id: 'cilium-mesh',
    name: 'Cilium',
    category: 'core',
    description: 'eBPF-based high performance networking, multi-cluster service mesh, and transparent security.',
    version: 'v1.17.1',
    publisher: 'Isovalent / CNCF',
    isVerified: true,
    iconColor: '#0092d0',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/cilium.svg',
    defaultNs: 'kube-system',
  },

  // 2. Observability & Monitoring
  {
    id: 'grafana',
    name: 'Grafana',
    category: 'observability',
    description: 'Leading open-source platform for metrics analytics, visualization, and alerting dashboards.',
    version: '10.5.1',
    publisher: 'Grafana Labs',
    isVerified: true,
    iconColor: '#f97316',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/grafana.svg',
    defaultNs: 'monitoring',
    defaultHost: 'grafana.localhost',
    hasIngress: true,
    hasStorage: true,
    hasDashboard: true,
    getDashboardUrl: () => 'http://grafana.localhost',
  },
  {
    id: 'prometheus-operator',
    name: 'Prometheus',
    category: 'observability',
    description: 'End-to-end Kubernetes monitoring stack with Prometheus, Alertmanager, and node-exporters.',
    version: 'v69.3.2',
    publisher: 'Prometheus Community / CNCF',
    isVerified: true,
    iconColor: '#e6522c',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/prometheus.svg',
    defaultNs: 'monitoring',
    defaultHost: 'prometheus.localhost',
    hasIngress: true,
    hasStorage: true,
    hasDashboard: true,
    getDashboardUrl: () => 'http://prometheus.localhost',
  },
  {
    id: 'grafana-loki',
    name: 'Loki',
    category: 'observability',
    description: 'Scalable, multi-tenant log aggregation system optimized for indexing Kubernetes stdout logs.',
    version: 'v6.27.0',
    publisher: 'Grafana Labs',
    isVerified: true,
    iconColor: '#f05a28',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/loki.svg',
    defaultNs: 'monitoring',
    hasStorage: true,
  },

  // 3. GitOps & CI/CD
  {
    id: 'argocd',
    name: 'Argo CD',
    category: 'gitops',
    description: 'Declarative multi-cluster GitOps continuous delivery tool for Kubernetes deployment automation.',
    version: 'v7.8.8',
    publisher: 'Argo Project / CNCF',
    isVerified: true,
    iconColor: '#ef7b00',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/argo-cd.svg',
    defaultNs: 'argocd',
    defaultHost: 'argocd.localhost',
    hasIngress: true,
    hasDashboard: true,
    getDashboardUrl: () => 'http://argocd.localhost',
  },
  {
    id: 'gitea',
    name: 'Gitea',
    category: 'gitops',
    description: 'Painless self-hosted Git service and lightweight DevOps platform with built-in CI/CD actions.',
    version: '12.6.0',
    publisher: 'Gitea Community',
    isVerified: true,
    iconColor: '#609926',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/gitea.svg',
    defaultNs: 'gitea',
    defaultHost: 'gitea.localhost',
    hasIngress: true,
    hasStorage: true,
    hasDashboard: true,
    getDashboardUrl: () => 'http://gitea.localhost',
  },

  // 4. Security & Governance
  {
    id: 'kyverno-policy',
    name: 'Kyverno',
    category: 'security',
    description: 'Kubernetes-native policy engine for GRC governance, pod security standards, and auto-mutation.',
    version: 'v3.3.7',
    publisher: 'Kyverno Project / CNCF',
    isVerified: true,
    iconColor: '#059669',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/kyverno.svg',
    defaultNs: 'kyverno',
  },
  {
    id: 'trivy-operator',
    name: 'Trivy',
    category: 'security',
    description: 'Continuous security scanner for Kubernetes detecting CVE vulnerabilities and misconfigurations.',
    version: 'v0.24.1',
    publisher: 'Aqua Security',
    isVerified: true,
    iconColor: '#16a34a',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/trivy.png',
    defaultNs: 'trivy-system',
  },

  // 5. Storage & Disaster Recovery
  {
    id: 'velero-dr',
    name: 'Velero',
    category: 'storage',
    description: 'Disaster recovery, scheduled volume snapshots, and multi-cluster backup migration.',
    version: 'v8.6.0',
    publisher: 'VMware Tanzu / Velero',
    isVerified: true,
    iconColor: '#8b5cf6',
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/velero.svg',
    defaultNs: 'velero',
  },
];

export function getCatalogAppById(id: string): CatalogAppItem | undefined {
  return CATALOG_APPS.find((app) => app.id === id);
}

export function getDefaultCatalogAppValues(appId: string): string {
  switch (appId) {
    case 'traefik':
      return `service:
  type: ClusterIP
ports:
  web:
    port: 8000
    hostPort: 80
    expose:
      default: true
  websecure:
    port: 8443
    hostPort: 443
    expose:
      default: true
nodeSelector:
  ingress-ready: "true"
tolerations:
  - key: "node-role.kubernetes.io/control-plane"
    operator: "Exists"
    effect: "NoSchedule"
ingressRoute:
  dashboard:
    enabled: true
    matchRule: Host(\`traefik.localhost\`)
`;
    case 'metrics-server':
      return `args:
  - --kubelet-insecure-tls
  - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
`;
    case 'cert-manager':
      return `installCRDs: true
`;
    case 'gitea':
      return `ingress:
  enabled: true
  className: cilium
  hosts:
    - host: gitea.localhost
      paths:
        - path: /
          pathType: Prefix
gitea:
  config:
    server:
      DOMAIN: gitea.localhost
      ROOT_URL: http://gitea.localhost/
    actions:
      ENABLED: true
persistence:
  enabled: true
  size: 10Gi
`;
    case 'flux-operator':
      return `web:
  enabled: true
  networkPolicy:
    create: false
  ingress:
    enabled: true
    className: cilium
    hosts:
      - host: flux.localhost
        paths:
          - path: /
            pathType: Prefix
`;
    case 'grafana':
      return `ingress:
  enabled: true
  ingressClassName: cilium
  hosts:
    - grafana.localhost
  path: /
grafana.ini:
  server:
    domain: grafana.localhost
    root_url: http://grafana.localhost/
persistence:
  enabled: true
  size: 10Gi
adminPassword: admin
`;
    case 'argocd':
      return `server:
  ingress:
    enabled: true
    ingressClassName: cilium
    hostname: argocd.localhost
`;
    case 'prometheus-operator':
      return `prometheus:
  ingress:
    enabled: true
    ingressClassName: cilium
    hosts:
      - prometheus.localhost
  prometheusSpec:
    scrapeInterval: 15s
`;
    case 'grafana-loki':
      return `deploymentMode: SingleBinary
singleBinary:
  replicas: 1
  ingress:
    enabled: true
    ingressClassName: cilium
    hosts:
      - loki.localhost
`;
    default:
      return `# Default configuration for ${appId}
# Tune application parameters here
`;
  }
}
