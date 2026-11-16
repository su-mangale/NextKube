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
  provider: 'GCP' | 'AWS' | 'Azure' | 'Nutanix' | 'OpenShift' | 'Baremetal' | 'Custom';
  fleetId: string;
  method: 'kubeconfig' | 'agent';
  kubeconfigRaw?: string;
  version?: string;
  labels?: Record<string, string>;
}
