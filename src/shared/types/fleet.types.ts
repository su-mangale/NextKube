export type FleetEnvironment = 'production' | 'staging' | 'development' | 'edge';

export interface FleetClusterSelector {
  matchLabels?: Record<string, string>;
}

export interface FleetInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  environment: FleetEnvironment;
  clusterSelector?: FleetClusterSelector;
  clusterIds: string[]; // Explicit member cluster IDs
  labels: Record<string, string>;
  defaultPlatformApps?: string[]; // E.g. ['cert-manager', 'prometheus-operator']
  createdAt: string;
  updatedAt?: string;
}

export interface AttachedClusterPayload {
  name: string;
  provider: 'GCP' | 'AWS' | 'Azure' | 'Nutanix' | 'OpenShift' | 'Baremetal' | 'Kind' | 'Minikube' | 'Custom';
  fleetId: string;
  environment?: FleetEnvironment;
  method: 'kubeconfig' | 'serviceToken' | 'agent';
  // Kubeconfig fields
  kubeconfigRaw?: string;
  contextName?: string;
  // ServiceAccount Token fields
  serverUrl?: string;
  serviceToken?: string;
  caCert?: string;
  skipTls?: boolean;
  // Metadata
  version?: string;
  nodeCount?: number;
  labels?: Record<string, string>;
}

export interface ClusterConnectionTestResult {
  success: boolean;
  version?: string;
  nodeCount?: number;
  serverUrl?: string;
  latencyMs?: number;
  error?: string;
}
