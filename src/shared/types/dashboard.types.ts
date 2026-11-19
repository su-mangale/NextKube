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
  unschedulable?: boolean;
  taints?: Array<{ key: string; value?: string; effect: string }>;
  conditions?: Array<{ type: string; status: string; reason?: string; message?: string }>;
  podCount?: number;
  cpuCapacity?: string;
  memoryCapacity?: string;
  podsCapacity?: string;
  cpuAllocatable?: string;
  memoryAllocatable?: string;
}

export interface NodeDrainOptions {
  nodeName: string;
  ignoreDaemonSets?: boolean;
  deleteEmptyDirData?: boolean;
  force?: boolean;
  gracePeriodSeconds?: number;
  timeoutSeconds?: number;
}

export interface NodeDrainProgressItem {
  timestamp: string;
  podName?: string;
  namespace?: string;
  status: 'cordoned' | 'evicting' | 'evicted' | 'skipped' | 'failed' | 'completed';
  message: string;
}

export interface NodeDrainResult {
  success: boolean;
  message: string;
  totalPods: number;
  evictedPods: number;
  skippedPods: number;
  failedPods: number;
  logs: NodeDrainProgressItem[];
}

export interface NodeDrainPreview {
  nodeName: string;
  isCordoned: boolean;
  totalPods: number;
  evictablePods: Array<{ name: string; namespace: string; kind: string }>;
  daemonSetPods: Array<{ name: string; namespace: string }>;
  emptyDirPods: Array<{ name: string; namespace: string }>;
  standalonePods: Array<{ name: string; namespace: string }>;
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
  rawTimestamp?: string;
  replicas?: number;
  readyReplicas?: number;
  isCurrent?: boolean;
  manifestYaml?: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffSummary {
  additions: number;
  deletions: number;
  modifications: number;
  identical: boolean;
}

export interface ConfigDriftItem {
  id: string;
  workloadName: string;
  workloadKind: 'Deployment' | 'StatefulSet' | 'DaemonSet';
  namespace: string;
  configType: 'ConfigMap' | 'Secret';
  configName: string;
  configUpdated: string;
  configRawTimestamp?: string;
  driftStatus: 'DRIFTED' | 'SYNCHRONIZED';
  stalePodCount: number;
  totalPodCount: number;
  stalePods: string[];
  explanation: string;
  referencedKeys: string[];
  latestConfigYaml?: string;
}

export interface ConfigDriftSummary {
  totalWorkloads: number;
  driftedWorkloads: number;
  synchronizedWorkloads: number;
  items: ConfigDriftItem[];
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
  action: string;
  resourceType: string;
  resourceName: string;
  namespace: string;
  details?: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  ip?: string;
  device?: string;
  userAgent?: string;
}

export interface GitOpsApp {
  id: string;
  name: string;
  clusterId: string;
  repoUrl: string;
  targetRevision: string;
  path: string;
  destinationNamespace: string;
  syncStatus: 'Synced' | 'OutOfSync' | 'Syncing' | 'Unknown';
  healthStatus: 'Healthy' | 'Progressing' | 'Degraded' | 'Suspended';
  autoSync: boolean;
  selfHeal: boolean;
  autoPrune: boolean;
  lastSyncedAt: string;
  lastSyncedCommit: {
    sha: string;
    author: string;
    message: string;
    date: string;
  };
  liveResourcesCount: number;
  syncHistory: Array<{
    id: string;
    commitSha: string;
    commitMessage: string;
    author: string;
    syncedAt: string;
    status: 'SUCCESS' | 'FAILED';
    duration: string;
  }>;
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

// ==========================================
// Visual Topology Graph Types
// ==========================================

export type TopologyKind =
  | 'Ingress'
  | 'Gateway'
  | 'Service'
  | 'Deployment'
  | 'DaemonSet'
  | 'StatefulSet'
  | 'Job'
  | 'Pod'
  | 'Node'
  | 'PVC'
  | 'ConfigMap'
  | 'Secret';

export interface TopologyNode {
  id: string;
  kind: TopologyKind;
  name: string;
  namespace: string;
  status: 'Healthy' | 'Warning' | 'Error' | 'Pending' | 'Terminating' | string;
  detail?: string;
  restarts?: number;
  ip?: string;
  nodeName?: string;
  image?: string;
  containers?: string[];
  labels?: Record<string, string>;
  tier: number; // 0: Ingress/Gateway, 1: Service, 2: Workload, 3: Pod, 4: Infra (Node, PVC)
  podCount?: number;
  readyReplicas?: number;
  desiredReplicas?: number;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  relation: 'routes-to' | 'selects' | 'manages' | 'runs-on' | 'claims' | 'exposes';
  label?: string;
  status?: 'active' | 'warning' | 'error';
}

export interface ClusterTopology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  summary: {
    totalNodes: number;
    totalEdges: number;
    ingressCount: number;
    serviceCount: number;
    workloadCount: number;
    podCount: number;
    infraCount: number;
    healthyCount: number;
    warningCount: number;
    errorCount: number;
  };
}

// ==========================================
// AI-Powered Root-Cause Analysis (RCA) Types
// ==========================================

export interface PodDiagnosticReport {
  podName: string;
  namespace: string;
  severity: 'critical' | 'warning' | 'info';
  status: string;
  rootCause: string;
  explanation: string;
  evidence: {
    exitCode?: number;
    terminationReason?: string;
    failedEvent?: string;
    relevantLogSnippet?: string;
    containerName?: string;
    restartCount?: number;
    memoryLimit?: string;
    cpuLimit?: string;
  };
  suggestedFix: {
    description: string;
    actionType: 'patch-deployment' | 'restart' | 'check-config' | 'check-network' | 'none';
    patchYaml?: string;
    targetWorkload?: {
      kind: string;
      name: string;
      namespace: string;
    };
  };
  rawLogs?: string;
  analyzedAt: string;
}

// ==========================================
// Universal Command Palette Types
// ==========================================

export interface CommandPaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Clusters' | 'Workloads' | 'Navigation' | 'Actions' | 'Namespaces';
  shortcut?: string;
  icon?: string;
  action: () => void;
}

// ==========================================
// Helm App Store & Catalog Types
// ==========================================

export interface HelmCatalogField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  defaultValue: any;
  options?: string[];
  description?: string;
}

export interface HelmCatalogItem {
  id: string;
  name: string;
  displayName: string;
  repo: string;
  repoUrl: string;
  iconUrl?: string;
  description: string;
  version: string;
  appVersion: string;
  category: 'Networking' | 'Monitoring' | 'Databases' | 'GitOps' | 'AI & ML' | 'Security';
  defaultValuesYaml: string;
  schemaFields: HelmCatalogField[];
}

// ==========================================
// In-Browser Port-Forwarding Types
// ==========================================

export interface PortForwardSession {
  id: string;
  clusterId: string;
  namespace: string;
  targetType: 'pod' | 'service';
  targetName: string;
  targetPort: number;
  localPort: number;
  status: 'active' | 'connecting' | 'stopped' | 'error';
  errorMessage?: string;
  createdAt: string;
  lastActive?: string;
  connectionsCount: number;
  bytesReceived: number;
  bytesSent: number;
  url: string;
  proxyUrl: string;
}

export interface CreatePortForwardRequest {
  namespace: string;
  targetType: 'pod' | 'service';
  targetName: string;
  targetPort: number;
  localPort?: number;
}

export interface PortForwardTargetOption {
  name: string;
  type: 'pod' | 'service';
  namespace: string;
  ports: number[];
  status?: string;
}

// ==========================================
// Phase 4: FinOps Cost Allocation & Right-Sizing Types
// ==========================================

export interface ResourceCostRates {
  cpuPerCoreHour: number; // e.g. 0.0316
  memoryPerGiBHour: number; // e.g. 0.0042
  storagePerGiBMonth: number; // e.g. 0.10
}

export interface WorkloadCostBreakdown {
  name: string;
  namespace: string;
  kind: 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Pod';
  replicas: number;
  cpuRequestedCores: number;
  cpuUsedCores: number;
  memoryRequestedGiB: number;
  memoryUsedGiB: number;
  monthlyCost: number;
  wastedMonthlyCost: number;
  efficiencyScore: number; // 0 - 100%
  status: 'optimal' | 'overprovisioned' | 'underprovisioned' | 'unbounded';
}

export interface NamespaceCostBreakdown {
  namespace: string;
  workloadCount: number;
  monthlyCost: number;
  wastedMonthlyCost: number;
  cpuRequestedCores: number;
  memoryRequestedGiB: number;
  sharePercentage: number;
}

export interface RightSizingRecommendation {
  id: string;
  workloadName: string;
  namespace: string;
  kind: 'Deployment' | 'StatefulSet' | 'DaemonSet';
  containerName: string;
  currentCpuRequest: string;
  currentMemoryRequest: string;
  currentCpuLimit?: string;
  currentMemoryLimit?: string;
  recommendedCpuRequest: string;
  recommendedMemoryRequest: string;
  recommendedCpuLimit: string;
  recommendedMemoryLimit: string;
  estimatedMonthlySavings: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  confidenceScore: number; // 0 - 100
}

export interface ClusterFinOpsSummary {
  clusterId: string;
  currency: string;
  estimatedMonthlySpend: number;
  estimatedMonthlyWaste: number;
  efficiencyPercentage: number;
  rates: ResourceCostRates;
  namespaces: NamespaceCostBreakdown[];
  topCostlyWorkloads: WorkloadCostBreakdown[];
  recommendations: RightSizingRecommendation[];
  totalCpuRequested: number;
  totalMemoryRequestedGiB: number;
  totalStorageAllocatedGiB: number;
  updatedAt: string;
}

export interface ApplyRightSizingRequest {
  namespace: string;
  kind: 'Deployment' | 'StatefulSet' | 'DaemonSet';
  name: string;
  containerName: string;
  cpuRequest: string;
  memoryRequest: string;
  cpuLimit: string;
  memoryLimit: string;
}

// ==========================================
// Phase 5: Security Posture, CIS Benchmark & RBAC Matrix Types
// ==========================================

export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SecurityViolation {
  id: string;
  ruleId: string;
  severity: SecuritySeverity;
  category: 'Privilege & Isolation' | 'Runtime Hardening' | 'Resource Limits' | 'Network & Auth';
  workloadName: string;
  namespace: string;
  kind: 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Pod';
  containerName?: string;
  title: string;
  message: string;
  remediation: string;
  cisSection?: string;
}

export interface SecurityCategoryScore {
  category: string;
  score: number; // 0 - 100
  passedChecks: number;
  totalChecks: number;
}

export interface SecurityPostureReport {
  clusterId: string;
  score: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  scannedWorkloadsCount: number;
  violations: SecurityViolation[];
  categoryScores: SecurityCategoryScore[];
  updatedAt: string;
}

export interface RbacCheckRequest {
  subjectKind: 'User' | 'Group' | 'ServiceAccount';
  subjectName: string;
  namespace: string;
  verb: 'get' | 'list' | 'watch' | 'create' | 'update' | 'patch' | 'delete' | 'deletecollection' | '*';
  resource: string; // e.g. pods, deployments, secrets, *
  subresource?: string; // e.g. exec, log, status
}

export interface RbacCheckResult {
  allowed: boolean;
  reason: string;
  subject: string;
  verb: string;
  resource: string;
  namespace: string;
  matchedRule?: string;
  grantingRole?: string;
  grantingBinding?: string;
}

export interface RbacMatrixPermission {
  resource: string;
  verbs: string[];
}

export interface RbacMatrixEntry {
  id: string;
  subjectName: string;
  subjectKind: 'ServiceAccount' | 'User' | 'Group';
  namespace: string;
  roleName: string;
  roleKind: 'Role' | 'ClusterRole';
  bindingName: string;
  permissions: RbacMatrixPermission[];
}

// ==========================================
// Phase 6: Namespace Cloner & Multi-Document YAML Exporter Types
// ==========================================

export interface NamespaceClonePreview {
  sourceNamespace: string;
  resourceCounts: Record<string, number>;
  totalResources: number;
  sampleResourceNames: Record<string, string[]>;
  sanitizedYamlPreview: string;
}

export interface NamespaceCloneRequest {
  sourceNamespace: string;
  targetNamespace: string;
  resourceTypes: string[];
  includeSecrets?: boolean;
  includePVCs?: boolean;
  createTargetNamespace?: boolean;
}

export interface NamespaceCloneProgressItem {
  timestamp: string;
  resourceType: string;
  resourceName: string;
  status: 'pending' | 'created' | 'skipped' | 'failed';
  message: string;
}

export interface NamespaceCloneResult {
  success: boolean;
  message: string;
  sourceNamespace: string;
  targetNamespace: string;
  totalCreated: number;
  totalSkipped: number;
  totalFailed: number;
  logs: NamespaceCloneProgressItem[];
}

// FluxCD GitOps Architecture Types
export interface FluxGitRepository {
  id: string;
  name: string;
  namespace: string;
  url: string;
  branch: string;
  tag?: string;
  semver?: string;
  secretRef?: string;
  interval: string;
  ready: boolean;
  statusMessage: string;
  artifactRevision?: string;
  lastReconciledAt: string;
  suspended: boolean;
}

export interface FluxOCIRepository {
  id: string;
  name: string;
  namespace: string;
  url: string;
  tag?: string;
  digest?: string;
  secretRef?: string;
  interval: string;
  ready: boolean;
  statusMessage: string;
  lastReconciledAt: string;
  suspended: boolean;
}

export interface FluxBucket {
  id: string;
  name: string;
  namespace: string;
  endpoint: string;
  bucketName: string;
  provider: 'generic' | 'aws' | 'gcp' | 'azure' | 'minio';
  secretRef?: string;
  interval: string;
  ready: boolean;
  statusMessage: string;
  lastReconciledAt: string;
  suspended: boolean;
}

export interface FluxHelmRepository {
  id: string;
  name: string;
  namespace: string;
  url: string;
  type: 'default' | 'oci';
  secretRef?: string;
  interval: string;
  ready: boolean;
  statusMessage: string;
  lastReconciledAt: string;
  suspended: boolean;
}

export interface FluxKustomization {
  id: string;
  name: string;
  namespace: string;
  sourceKind: 'GitRepository' | 'OCIRepository' | 'Bucket';
  sourceName: string;
  path: string;
  prune: boolean;
  targetNamespace?: string;
  interval: string;
  retryInterval?: string;
  ready: boolean;
  statusMessage: string;
  lastAppliedRevision: string;
  lastAttemptedRevision?: string;
  suspended: boolean;
  lastReconciledAt: string;
}

export interface FluxHelmRelease {
  id: string;
  name: string;
  namespace: string;
  chartSourceKind: 'HelmRepository' | 'GitRepository' | 'OCIRepository';
  chartSourceName: string;
  chart: string;
  version: string;
  targetNamespace?: string;
  interval: string;
  ready: boolean;
  statusMessage: string;
  suspended: boolean;
  lastReconciledAt: string;
}

export interface FluxImageRepository {
  id: string;
  name: string;
  namespace: string;
  image: string;
  interval: string;
  scanStatus: 'OK' | 'Scanning' | 'Failed';
  lastScannedAt: string;
  scannedTagsCount: number;
}

export interface FluxImagePolicy {
  id: string;
  name: string;
  namespace: string;
  imageRepoRef: string;
  policyType: 'semver' | 'numerical' | 'regex';
  range: string;
  selectedTag: string;
  lastEvaluatedAt: string;
}

export interface FluxImageUpdateAutomation {
  id: string;
  name: string;
  namespace: string;
  gitRepoRef: string;
  updatePath: string;
  checkoutBranch: string;
  commitMessage: string;
  lastPushedCommit: string;
  suspended: boolean;
  lastRunAt: string;
}

export interface FluxClusterState {
  clusterId: string;
  gitRepositories: FluxGitRepository[];
  ociRepositories: FluxOCIRepository[];
  buckets: FluxBucket[];
  helmRepositories: FluxHelmRepository[];
  kustomizations: FluxKustomization[];
  helmReleases: FluxHelmRelease[];
  imageRepositories: FluxImageRepository[];
  imagePolicies: FluxImagePolicy[];
  imageUpdateAutomations: FluxImageUpdateAutomation[];
}






