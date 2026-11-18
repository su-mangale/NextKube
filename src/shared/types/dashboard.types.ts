export type ClusterStatus = 'Healthy' | 'Provisioning' | 'Degraded' | 'Failed';

export interface Cluster {
  id: string;
  name: string;
  provider: string; // 'GCP' | 'AWS' | 'Nutanix' etc.
  version: string;  // e.g. 'v1.33.0'
  status: ClusterStatus;
  nodeCount: number;
  cpuUtil: number; // Percentage or null for provisioning
  memoryUtil: number; // Percentage or null for provisioning
  lastUpdated: string;
}

export interface ResourceTotals {
  nodes: number;
  pods: number;
  namespaces: number;
  deployments: number;
}

export interface UtilizationMetrics {
  cpu: number;
  memory: number;
  storage: number;
}

export interface RecentActivity {
  id: string;
  description: string;
  timestamp: string; // Relative time, e.g., '5 minutes ago'
  status: 'info' | 'success' | 'warning' | 'error';
}

export interface RecentEvent {
  id: string;
  severity: 'success' | 'warning' | 'error' | 'info';
  description: string;
  timestamp: string;
}

export interface DashboardData {
  overview: {
    totalClusters: number;
    healthyClusters: number;
    provisioningClusters: number;
    failedClusters: number;
  };
  resources: ResourceTotals;
  utilization: UtilizationMetrics;
  utilizationHistory: {
    timestamp: string;
    cpu: number;
    memory: number;
    storage: number;
  }[];
  clusters: Cluster[];
  activities: RecentActivity[];
  events: RecentEvent[];
}

export interface NodeInfo {
  name: string;
  status: 'Ready' | 'NotReady';
  role: 'control-plane' | 'worker';
  version: string;
  cpu: string;
  memory: string;
  ip: string;
}

export interface GitOpsSync {
  repoName: string;
  url: string;
  status: 'Synced' | 'Reconciling' | 'Stalled';
  lastSynced: string;
}

export interface ClusterDetailData {
  id: string;
  name: string;
  type: 'management' | 'workload';
  provider: string;
  version: string;
  status: ClusterStatus;
  nodes: NodeInfo[];
  gitops: GitOpsSync[];
  resources: ResourceTotals;
  utilization: UtilizationMetrics;
  utilizationHistory: {
    timestamp: string;
    cpu: number;
    memory: number;
    storage: number;
  }[];
  activities: RecentActivity[];
  events: RecentEvent[];
}

export type DashboardQueryResult = DashboardData | ClusterDetailData;

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  time: string;
}

export interface GitOpsRepository {
  id: string;
  clusterId: string;
  clusterName: string;
  repoName: string;
  url: string;
  branch: string;
  path: string;
  status: 'Synced' | 'Reconciling' | 'Stalled';
  lastSynced: string;
  lastCommit?: CommitInfo;
}

export interface K8sDeployment {
  name: string;
  namespace: string;
  readyReplicas: number;
  replicas: number;
  updatedReplicas: number;
  availableReplicas: number;
  age: string;
  image?: string;
  containers?: string[];
}

export interface K8sService {
  name: string;
  namespace: string;
  type: string;
  clusterIp: string;
  externalIp: string;
  clusterIP?: string;
  externalIP?: string;
  ports: string;
  age: string;
}

export interface K8sPod {
  name: string;
  namespace: string;
  ready: string;
  status: string;
  restarts: number;
  ip: string;
  node: string;
  age: string;
  image?: string;
  containers?: string[];
  cpuUsage?: string;
  memoryUsage?: string;
}

export interface K8sIngress {
  name: string;
  namespace: string;
  ingressClass: string;
  hosts: string;
  address: string;
  ports: string;
  age: string;
}

export interface K8sIngressClass {
  name: string;
  controller: string;
  isDefault: boolean;
  age: string;
}

export interface K8sConfigMap {
  name: string;
  namespace: string;
  dataCount: number;
  keysCount?: number;
  age: string;
}

export interface K8sSecret {
  name: string;
  namespace: string;
  type: string;
  dataCount: number;
  keysCount?: number;
  age: string;
}

export interface K8sNode {
  name: string;
  status: 'Ready' | 'NotReady';
  roles: string;
  role?: string;
  age: string;
  version: string;
  internalIp: string;
  externalIp: string;
  cpuPressure: boolean;
  memoryPressure: boolean;
  diskPressure: boolean;
  pidPressure: boolean;
  cpuCapacity?: string;
  memoryCapacity?: string;
  podsCapacity?: string;
  cpuAllocatable?: string;
  memoryAllocatable?: string;
}

export interface K8sEvent {
  id: string;
  lastSeen: string;
  type: 'Normal' | 'Warning';
  reason: string;
  object: string;
  message: string;
  namespace: string;
}

export interface K8sResourceQuota {
  name: string;
  namespace: string;
  resource: string;
  used: string;
  hard: string;
}

export interface K8sGitOps {
  name: string;
  url: string;
  branch: string;
  status: 'Synced' | 'Reconciling' | 'Stalled';
  lastSynced: string;
}

export interface K8sRolloutRevision {
  revision: number;
  changeCause?: string;
  image?: string;
  timestamp: string;
}

export interface K8sPodLogs {
  logs: string;
}

export interface K8sMachineDeployment {
  name: string;
  namespace: string;
  clusterName: string;
  desiredReplicas: number;
  readyReplicas: number;
  version: string;
  age: string;
}

export interface K8sHelmRevision {
  revision: number;
  updated: string;
  status: string;
  chart: string;
  appVersion?: string;
  description?: string;
}

export interface K8sHelmRelease {
  name: string;
  namespace: string;
  status: 'deployed' | 'failed' | 'superseded' | 'uninstalled' | string;
  chart: string;
  chartVersion?: string;
  appVersion?: string;
  revision: number;
  updated: string;
  age: string;
  message?: string;
  version?: string;
  values?: Record<string, any> | string;
  manifest?: string;
  revisions?: K8sHelmRevision[];
}

export interface K8sDaemonSet {
  name: string;
  namespace: string;
  desiredNumberScheduled: number;
  currentNumberScheduled: number;
  numberReady: number;
  updatedNumberScheduled?: number;
  numberAvailable?: number;
  nodeSelector?: string;
  age: string;
  image?: string;
  containers?: string[];
}

export interface K8sStatefulSet {
  name: string;
  namespace: string;
  readyReplicas: number;
  replicas: number;
  serviceName: string;
  age: string;
  image?: string;
  containers?: string[];
}

export interface K8sReplicaSet {
  name: string;
  namespace: string;
  desiredReplicas: number;
  currentReplicas: number;
  readyReplicas: number;
  owner: string;
  age: string;
  image?: string;
}

export interface K8sCronJob {
  name: string;
  namespace: string;
  schedule: string;
  suspend: boolean;
  active: number;
  activeJobs?: number;
  lastSchedule: string;
  age: string;
  image?: string;
}

export interface K8sJob {
  name: string;
  namespace: string;
  completions: string;
  duration: string;
  status: 'Succeeded' | 'Running' | 'Failed';
  succeeded?: number;
  failed?: number;
  age: string;
  image?: string;
  containers?: string[];
}

export interface K8sNetworkPolicy {
  name: string;
  namespace: string;
  podSelector: string;
  policyTypes: string;
  age: string;
}

export interface K8sPVC {
  name: string;
  namespace: string;
  status: 'Bound' | 'Pending' | 'Lost';
  volume: string;
  capacity: string;
  accessModes: string;
  storageClass: string;
  age: string;
}

export interface K8sPV {
  name: string;
  capacity: string;
  accessModes: string;
  reclaimPolicy: string;
  status: 'Available' | 'Bound' | 'Released';
  claim: string;
  storageClass: string;
  age: string;
}

export interface K8sStorageClass {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  isDefault: boolean;
  age: string;
}

export interface K8sServiceAccount {
  name: string;
  namespace: string;
  secretsCount: number;
  age: string;
}

export interface K8sRole {
  name: string;
  namespace: string;
  rulesCount: number;
  isClusterRole: boolean;
  age: string;
}

export interface K8sRoleBinding {
  name: string;
  namespace: string;
  roleRef: string;
  subjects: string;
  isClusterBinding: boolean;
  age: string;
}

export interface K8sNamespaceInfo {
  name: string;
  status: 'Active' | 'Terminating';
  age: string;
}

export interface K8sCRD {
  name: string;
  group: string;
  version: string;
  scope: 'Namespaced' | 'Cluster';
  kind: string;
  instancesCount: number;
  age: string;
}

export interface K8sHPA {
  name: string;
  namespace: string;
  reference: string;
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  desiredReplicas: number;
  metrics: string;
  age: string;
}

export interface K8sGateway {
  name: string;
  namespace: string;
  className: string;
  listeners: string;
  addresses: string;
  status: 'Programmed' | 'Pending' | 'NotProgrammed';
  age: string;
}

export interface K8sHTTPRoute {
  name: string;
  namespace: string;
  hostnames: string;
  parentRefs: string;
  rulesCount: number;
  age: string;
}

// ==========================================
// Platform Application Operator Types (GitOps CRD)
// ==========================================

export interface PlatformAppEndpoint {
  name: string;
  url: string;
  type?: 'internal' | 'external' | 'database' | 'ui' | 'metrics';
}

export interface PlatformAppCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  lastTransitionTime?: string;
  message?: string;
  reason?: string;
}

export interface PlatformAppLifecycle {
  preservePVCsOnDelete?: boolean;
  purgeCRDsOnDelete?: boolean;
}

export interface PlatformAppTargetRef {
  kind: 'Cluster' | 'Fleet';
  name: string;
}

export interface PlatformAppValuesReference {
  kind: 'ConfigMap' | 'Secret';
  name: string;
  valuesKey?: string;
}

export interface PlatformAppRemediation {
  autoRollback?: boolean;
  retries?: number;
}

export interface PlatformAppSpec {
  catalogAppId: string;
  version?: string;
  enabled: boolean;
  targetNamespace?: string;
  targetRef?: PlatformAppTargetRef;
  valuesOverrides?: Record<string, unknown>;
  lifecycle?: PlatformAppLifecycle;
  dependsOn?: string[];
  valuesFrom?: PlatformAppValuesReference[];
  remediation?: PlatformAppRemediation;
  clusterSelector?: {
    matchLabels?: Record<string, string>;
  };
}

export interface PlatformAppStatus {
  phase: 'Pending' | 'Installing' | 'Upgrading' | 'Healthy' | 'Degraded' | 'Suspended' | 'Failed' | 'Uninstalling' | 'Unknown';
  url?: string;
  observedGeneration?: number;
  installedVersion?: string;
  syncedGitCommit?: string;
  endpoints?: PlatformAppEndpoint[];
  conditions?: PlatformAppCondition[];
  lastReconciled?: string;
  message?: string;
}

export interface PlatformApp {
  name: string;
  namespace: string;
  spec: PlatformAppSpec;
  status?: PlatformAppStatus;
  age?: string;
}

// Glasskube-inspired Resolved Metadata Resource
export interface PlatformAppDependency {
  name: string;
  minVersion?: string;
  optional?: boolean;
}

export interface PlatformAppInfoSpec {
  catalogAppId: string;
  version: string;
  displayName?: string;
  description?: string;
  publisher?: string;
  iconUrl?: string;
  repository?: {
    name: string;
    url: string;
    chartName: string;
  };
  valuesSchema?: Record<string, unknown>;
  dependencies?: PlatformAppDependency[];
  manifestUrl?: string;
}

export interface PlatformAppInfoStatus {
  phase: 'Resolving' | 'Ready' | 'Failed';
  resolvedAt?: string;
  message?: string;
}

export interface PlatformAppInfo {
  name: string;
  spec: PlatformAppInfoSpec;
  status?: PlatformAppInfoStatus;
  age?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  clusterId: string;
  user: string;
  action: 'SCALE_REPLICAS' | 'ROLLOUT_RESTART' | 'SET_IMAGE' | 'DELETE_RESOURCE' | 'APPLY_MANIFEST' | 'BULK_DELETE' | 'EXEC_TERMINAL' | 'CUSTOM_OPERATION';
  resourceType: string;
  resourceName: string;
  namespace: string;
  details?: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  ip?: string;
}

export interface ClusterAnomaly {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'pod' | 'node' | 'deployment' | 'event';
  name: string;
  namespace?: string;
  message: string;
  recommendation: string;
  timestamp?: string;
}

export interface ClusterHealthReport {
  score: number;
  status: 'healthy' | 'degraded' | 'critical';
  anomalies: ClusterAnomaly[];
  counts: {
    critical: number;
    warning: number;
    info: number;
  };
}


