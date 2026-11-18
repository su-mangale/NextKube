'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Chip,
  Slider,
  TablePagination,
  Menu,
  ListItemIcon,
  ListItemText,
  Checkbox,
  LinearProgress,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import TerminalIcon from '@mui/icons-material/Terminal';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import InfoIcon from '@mui/icons-material/Info';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CodeIcon from '@mui/icons-material/Code';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StorageIcon from '@mui/icons-material/Storage';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SecurityIcon from '@mui/icons-material/Security';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import TuneIcon from '@mui/icons-material/Tune';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { useQueryClient } from '@tanstack/react-query';

import {
  useCluster,
  useCurrentUser,
  logout,
  useDashboardData,
  TerminalWindow,
  KubectlTerminalDrawer,
  ActionDock,
  SettingsDialog,
  useNamespaces,
  useDeployments,
  useServices,
  usePods,
  useIngresses,
  useConfigMaps,
  useSecrets,
  useNodes,
  useEvents,
  useDaemonSets,
  useStatefulSets,
  useReplicaSets,
  useCronJobs,
  useJobs,
  useNetworkPolicies,
  usePVCs,
  usePVs,
  useStorageClasses,
  useServiceAccounts,
  useRoles,
  useRoleBindings,
  useCRDs,
  useHPAs,
  useGateways,
  useHTTPRoutes,
  useAuditLogs,
  useClusterHealth,
  useHelmReleases,
  fetchHelmReleaseValues,
  rollbackHelmRelease,
  uninstallHelmRelease,
  AuditLogEntry,
  K8sHelmRelease,
  K8sHelmRevision,
  fetchResourceYaml,
  updateResourceYaml,
  deleteResource,
  scaleDeployment,
  rolloutDeployment,
  restartPod,
  setDeploymentImage,
  useRolloutHistory,
  fetchPodLogs,
  fetchDeploymentLogs,
  applyResourceYaml,
  YamlIdeEditor,
  YamlEditorDialog,
  AddClusterDialog,
  DraggablePaper,
  NoClusterView,
  getZoneUrl,
} from '@/shared';

export default function ClusterDetailPage({
  params,
}: {
  params?: Promise<{ id: string }>;
}) {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || '';
  const router = useRouter();
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  // System & Workspace Settings Dialog
  const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false);

  // Namespace selector state
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');

  // Resource Tab selection state (0: Overview, 1: Pods, 2: Deployments, 3: DaemonSets, 4: StatefulSets, 5: ReplicaSets, 6: CronJobs & Jobs, 7: Services, 8: Ingresses, 9: NetworkPolicies, 10: ConfigMaps, 11: Secrets, 12: PVCs, 13: StorageClasses, 14: Nodes, 15: RBAC & SA, 16: CRDs, 17: Events)
  const [activeTab, setActiveTab] = useState<number>(0);

  // Search input state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Operations state
  const [selectedResource, setSelectedResource] = useState<any | null>(null);

  // Row Actions 3-dot Menu state
  const [rowMenuAnchorEl, setRowMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [rowMenuResource, setRowMenuResource] = useState<any | null>(null);
  const [rowMenuTab, setRowMenuTab] = useState<number>(1);

  // Describe Dialog state
  const [describeDialogOpen, setDescribeDialogOpen] = useState<boolean>(false);
  const [describeResource, setDescribeResource] = useState<any | null>(null);
  const [describeTab, setDescribeTab] = useState<number>(1);

  // Add / Connect Cluster Modal
  const [addClusterOpen, setAddClusterOpen] = useState<boolean>(false);

  // Apply / Create Resource Manifest Modal
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [createYamlVal, setCreateYamlVal] = useState<string>(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-nginx
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sample-nginx
  template:
    metadata:
      labels:
        app: sample-nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25-alpine
        ports:
        - containerPort: 80`);
  const [createLoading, setCreateLoading] = useState<boolean>(false);

  // Secret Decode preview state
  const [secretDecoded, setSecretDecoded] = useState<boolean>(false);

  // Dialog states
  const [yamlDialogOpen, setYamlDialogOpen] = useState<boolean>(false);
  const [yamlContent, setYamlContent] = useState<string>('');
  const [yamlLoading, setYamlLoading] = useState<boolean>(false);

  const [scaleDialogOpen, setScaleDialogOpen] = useState<boolean>(false);
  const [scaleReplicas, setScaleReplicas] = useState<number>(1);
  const [scaleLoading, setScaleLoading] = useState<boolean>(false);

  const [restartDialogOpen, setRestartDialogOpen] = useState<boolean>(false);
  const [restartLoading, setRestartLoading] = useState<boolean>(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const [rolloutDialogOpen, setRolloutDialogOpen] = useState<boolean>(false);
  const [rolloutLoading, setRolloutLoading] = useState<boolean>(false);
  const [rolloutMode, setRolloutMode] = useState<'restart' | 'rollback'>('restart');
  const [selectedRolloutRevision, setSelectedRolloutRevision] = useState<number | null>(null);

  const [yamlDialogMaximized, setYamlDialogMaximized] = useState<boolean>(false);
  const [yamlCopied, setYamlCopied] = useState<boolean>(false);
  const [describeCopied, setDescribeCopied] = useState<boolean>(false);

  // Logs states
  const [logsDialogOpen, setLogsDialogOpen] = useState<boolean>(false);
  const [logsContent, setLogsContent] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [logsSearchQuery, setLogsSearchQuery] = useState<string>('');
  const [logsDialogMaximized, setLogsDialogMaximized] = useState<boolean>(false);
  const [logsTimeFrame, setLogsTimeFrame] = useState<string>('all');
  const [logsPrevious, setLogsPrevious] = useState<boolean>(false);
  const [logsResourceType, setLogsResourceType] = useState<'pod' | 'deployment'>('pod');
  const [logsTimeMode, setLogsTimeMode] = useState<'local' | 'utc'>('local');
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    } catch {
      return 'Local';
    }
  }, []);

  // Multi-session Terminal Exec states
  interface ExecSession {
    id: string;
    resourceName: string;
    resourceType: 'pod' | 'node';
    namespace: string;
    container?: string;
    minimized: boolean;
  }
  const [execSessions, setExecSessions] = useState<ExecSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [topWindow, setTopWindow] = useState<string | null>('console');
  const [kubectlShellOpen, setKubectlShellOpen] = useState<boolean>(false);

  const [imageDialogOpen, setImageDialogOpen] = useState<boolean>(false);
  const [imageInputVal, setImageInputVal] = useState<string>('');
  const [imageLoading, setImageLoading] = useState<boolean>(false);

  // Bulk selection states
  const [selectedResources, setSelectedResources] = useState<any[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState<boolean>(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState<boolean>(false);

  // Pagination states
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  useEffect(() => {
    setSelectedResources([]);
    setSecretDecoded(false);
    setPage(0);
  }, [activeTab, selectedNamespace, searchQuery]);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  // Fetch cluster profile & metadata
  const { availableClusters, clustersLoading, disconnectCluster } = useCluster();
  const { data: currentUser } = useCurrentUser();
  const clusterMeta = useMemo(() => {
    return availableClusters.find((c) => c.id === id) || availableClusters[0] || null;
  }, [availableClusters, id]);

  const effectiveClusterId = clusterMeta?.id || id;

  useEffect(() => {
    if (clusterMeta?.id && id === 'default' && clusterMeta.id !== 'default') {
      router.replace(`/clusters/${clusterMeta.id}`);
    }
  }, [clusterMeta, id, router]);

  const {
    data: dashboardInfo,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useDashboardData({ clusterId: effectiveClusterId }) as any;

  // Fetch Native K8s API resources via hooks
  const { data: namespaces = [], isLoading: nsLoading, refetch: refetchNamespaces } = useNamespaces(effectiveClusterId);
  const { data: deployments = [], isLoading: depsLoading, refetch: refetchDeployments } = useDeployments(effectiveClusterId, selectedNamespace);
  const { data: services = [], isLoading: svcsLoading, refetch: refetchServices } = useServices(effectiveClusterId, selectedNamespace);
  const { data: pods = [], isLoading: podsLoading, refetch: refetchPods } = usePods(effectiveClusterId, selectedNamespace);
  const { data: ingresses = [], isLoading: ingsLoading, refetch: refetchIngresses } = useIngresses(effectiveClusterId, selectedNamespace);
  const { data: configMaps = [], isLoading: cmsLoading, refetch: refetchConfigMaps } = useConfigMaps(effectiveClusterId, selectedNamespace);
  const { data: secrets = [], isLoading: secretsLoading, refetch: refetchSecrets } = useSecrets(effectiveClusterId, selectedNamespace);
  const { data: nodes = [], isLoading: nodesLoading, refetch: refetchNodes } = useNodes(effectiveClusterId);
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useEvents(effectiveClusterId, selectedNamespace);

  const { data: daemonSets = [], isLoading: dsLoading, refetch: refetchDaemonSets } = useDaemonSets(effectiveClusterId, selectedNamespace);
  const { data: statefulSets = [], isLoading: stsLoading, refetch: refetchStatefulSets } = useStatefulSets(effectiveClusterId, selectedNamespace);
  const { data: replicaSets = [], isLoading: rsLoading, refetch: refetchReplicaSets } = useReplicaSets(effectiveClusterId, selectedNamespace);
  const { data: cronJobs = [], isLoading: cjLoading, refetch: refetchCronJobs } = useCronJobs(effectiveClusterId, selectedNamespace);
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useJobs(effectiveClusterId, selectedNamespace);
  const { data: networkPolicies = [], isLoading: netpolLoading, refetch: refetchNetworkPolicies } = useNetworkPolicies(effectiveClusterId, selectedNamespace);
  const { data: pvcs = [], isLoading: pvcLoading, refetch: refetchPVCs } = usePVCs(effectiveClusterId, selectedNamespace);
  const { data: pvs = [], isLoading: pvLoading, refetch: refetchPVs } = usePVs(effectiveClusterId);
  const { data: storageClasses = [], isLoading: scLoading, refetch: refetchStorageClasses } = useStorageClasses(effectiveClusterId);
  const { data: serviceAccounts = [], isLoading: saLoading, refetch: refetchServiceAccounts } = useServiceAccounts(effectiveClusterId, selectedNamespace);
  const { data: roles = [], isLoading: rolesLoading, refetch: refetchRoles } = useRoles(effectiveClusterId, selectedNamespace);
  const { data: roleBindings = [], isLoading: rbLoading, refetch: refetchRoleBindings } = useRoleBindings(effectiveClusterId, selectedNamespace);
  const { data: crds = [], isLoading: crdLoading, refetch: refetchCRDs } = useCRDs(effectiveClusterId);
  const { data: hpas = [], isLoading: hpasLoading, refetch: refetchHPAs } = useHPAs(effectiveClusterId, selectedNamespace);
  const { data: gateways = [], isLoading: gatewaysLoading, refetch: refetchGateways } = useGateways(effectiveClusterId, selectedNamespace);
  const { data: httpRoutes = [], isLoading: routesLoading, refetch: refetchHTTPRoutes } = useHTTPRoutes(effectiveClusterId, selectedNamespace);
  const { data: healthData, refetch: refetchHealth } = useClusterHealth(effectiveClusterId);
  const { data: auditLogs = [], isLoading: auditLoading, refetch: refetchAuditLogs } = useAuditLogs(effectiveClusterId);
  const { data: helmReleases = [], isLoading: helmLoading, refetch: refetchHelmReleases } = useHelmReleases(effectiveClusterId, selectedNamespace);

  const queryClient = useQueryClient();
  const [liveWatchConnected, setLiveWatchConnected] = useState<boolean>(false);
  const [healthBannerDismissed, setHealthBannerDismissed] = useState<boolean>(false);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  // Phase 6: Helm Release Management Dialog State
  const [helmValuesOpen, setHelmValuesOpen] = useState<boolean>(false);
  const [helmValuesContent, setHelmValuesContent] = useState<string>('');
  const [helmValuesLoading, setHelmValuesLoading] = useState<boolean>(false);
  const [helmRollbackOpen, setHelmRollbackOpen] = useState<boolean>(false);
  const [helmRollbackRev, setHelmRollbackRev] = useState<number>(1);
  const [helmRollbackLoading, setHelmRollbackLoading] = useState<boolean>(false);
  const [helmUninstallOpen, setHelmUninstallOpen] = useState<boolean>(false);
  const [helmUninstallLoading, setHelmUninstallLoading] = useState<boolean>(false);
  const [activeHelmRelease, setActiveHelmRelease] = useState<K8sHelmRelease | null>(null);

  // Phase 5: Live Watch SSE Stream Connection
  useEffect(() => {
    if (!effectiveClusterId || availableClusters.length === 0) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/clusters/${effectiveClusterId}/watch`);
      es.addEventListener('connected', () => {
        setLiveWatchConnected(true);
      });
      es.addEventListener('health-update', (event) => {
        try {
          const report = JSON.parse(event.data);
          queryClient.setQueryData(['clusterHealth', id], report);
        } catch { }
      });
      es.addEventListener('new-events', (event) => {
        try {
          const evList = JSON.parse(event.data);
          if (Array.isArray(evList) && evList.length > 0) {
            const latest = evList[0];
            if (latest.type === 'Warning') {
              setToastSeverity('warning');
              setToastMessage(`[Cluster Alert] ${latest.reason || 'Event'}: ${latest.message?.slice(0, 100)}`);
            }
          }
          refetchEvents();
        } catch { }
      });
      es.onerror = () => {
        setLiveWatchConnected(false);
      };
    } catch {
      setLiveWatchConnected(false);
    }

    return () => {
      if (es) {
        es.close();
      }
    };
  }, [id, queryClient, refetchEvents]);

  const { data: rolloutRevisions = [], isLoading: rolloutsLoading, refetch: refetchRolloutHistory } = useRolloutHistory(
    id,
    selectedResource?.name || '',
    selectedResource?.namespace || '',
    Boolean(selectedResource) && (rolloutDialogOpen || activeTab === 2)
  );

  const isDataLoading =
    metricsLoading ||
    nsLoading ||
    depsLoading ||
    svcsLoading ||
    podsLoading ||
    ingsLoading ||
    cmsLoading ||
    secretsLoading ||
    nodesLoading ||
    eventsLoading ||
    dsLoading ||
    stsLoading ||
    rsLoading ||
    cjLoading ||
    jobsLoading ||
    netpolLoading ||
    pvcLoading ||
    pvLoading ||
    scLoading ||
    saLoading ||
    rolesLoading ||
    rbLoading ||
    crdLoading ||
    auditLoading ||
    helmLoading;

  const handleRefreshAll = () => {
    refetchMetrics();
    refetchNamespaces();
    refetchDeployments();
    refetchServices();
    refetchPods();
    refetchIngresses();
    refetchConfigMaps();
    refetchSecrets();
    refetchNodes();
    refetchEvents();
    refetchDaemonSets();
    refetchStatefulSets();
    refetchReplicaSets();
    refetchCronJobs();
    refetchJobs();
    refetchNetworkPolicies();
    refetchPVCs();
    refetchPVs();
    refetchStorageClasses();
    refetchServiceAccounts();
    refetchRoles();
    refetchRoleBindings();
    refetchCRDs();
    refetchHPAs();
    refetchGateways();
    refetchHTTPRoutes();
    refetchHealth();
    refetchAuditLogs();
    refetchHelmReleases();
    setToastSeverity('success');
    setToastMessage('Reloading cluster resources from API...');
  };

  const handleOpenRowMenu = (event: React.MouseEvent<HTMLElement>, resource: any, tab: number) => {
    event.stopPropagation();
    setRowMenuAnchorEl(event.currentTarget);
    setRowMenuResource(resource);
    setRowMenuTab(tab);
  };

  const handleCloseRowMenu = () => {
    setRowMenuAnchorEl(null);
    setRowMenuResource(null);
  };

  const handleOpenDescribe = (resourceOverride?: any, tabOverride?: number) => {
    const resource = resourceOverride || selectedResource;
    if (!resource) return;
    setDescribeResource(resource);
    setDescribeTab(tabOverride !== undefined ? tabOverride : activeTab);
    setDescribeCopied(false);
    setDescribeDialogOpen(true);
  };

  const handleDownloadKubeconfig = () => {
    if (!clusterMeta) return;
    const yamlStr = `apiVersion: v1
kind: Config
clusters:
- name: ${clusterMeta.name}
  cluster:
    server: https://${clusterMeta.name}.k8s.ykp-platform.io:6443
contexts:
- name: ykp-${clusterMeta.name}-context
  context:
    cluster: ${clusterMeta.name}
    user: ykp-platform-operator
current-context: ykp-${clusterMeta.name}-context
users:
- name: ykp-platform-operator
  user:
    token: ykp-token-mock-auth-operator-session-${clusterMeta.id}`;

    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kubeconfig-${clusterMeta.name}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setToastSeverity('success');
    setToastMessage('Kubeconfig downloaded successfully.');
  };

  const handleApplyCreateResource = async () => {
    setCreateLoading(true);
    try {
      await applyResourceYaml(id, createYamlVal, selectedNamespace);
      setToastSeverity('success');
      setToastMessage('Kubernetes resource applied successfully.');
      setCreateDialogOpen(false);
      handleRefreshAll();
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to apply manifest.');
    } finally {
      setCreateLoading(false);
    }
  };

  const formatKubectlDescribe = (resource: any, tab: number): string => {
    try {
      if (!resource) return '';
      const name = typeof resource.name === 'string' ? resource.name : typeof resource.object === 'string' ? resource.object : 'unknown';
      const namespace = typeof resource.namespace === 'string' ? resource.namespace : 'default';
      const age = typeof resource.age === 'string' ? resource.age : 'N/A';
      const creationTimestamp = typeof resource.creationTimestamp === 'string' ? resource.creationTimestamp : 'N/A';

      let labels = `app.kubernetes.io/name=${name}`;
      if (resource.labels) {
        if (typeof resource.labels === 'object' && !Array.isArray(resource.labels)) {
          labels = Object.entries(resource.labels).map(([k, v]) => `${k}=${v}`).join('\n                ');
        } else if (typeof resource.labels === 'string') {
          labels = resource.labels;
        }
      }

      let annotations = '<none>';
      if (resource.annotations) {
        if (typeof resource.annotations === 'object' && !Array.isArray(resource.annotations)) {
          annotations = Object.entries(resource.annotations).map(([k, v]) => `${k}: ${v}`).join('\n                ');
        } else if (typeof resource.annotations === 'string') {
          annotations = resource.annotations;
        }
      }

      let kind = 'Resource';
      if (tab === 1 || resource.kind === 'Pod') kind = 'Pod';
      else if (tab === 2 || resource.kind === 'Deployment') kind = 'Deployment';
      else if (tab === 3 || resource.kind === 'DaemonSet') kind = 'DaemonSet';
      else if (tab === 4 || resource.kind === 'StatefulSet') kind = 'StatefulSet';
      else if (tab === 5 || resource.kind === 'ReplicaSet') kind = 'ReplicaSet';
      else if (tab === 6 || resource.kind === 'Job') kind = 'Job';
      else if (tab === 7 || resource.kind === 'CronJob') kind = 'CronJob';
      else if (tab === 8 || resource.kind === 'Service') kind = 'Service';
      else if (tab === 9 || resource.kind === 'Ingress') kind = 'Ingress';
      else if (tab === 10 || resource.kind === 'NetworkPolicy') kind = 'NetworkPolicy';
      else if (tab === 11 || resource.kind === 'ConfigMap') kind = 'ConfigMap';
      else if (tab === 12 || resource.kind === 'Secret') kind = 'Secret';
      else if (tab === 13) {
        kind = resource.kind === 'PersistentVolume' || (!resource.namespace && resource.capacity) ? 'PersistentVolume' : 'PersistentVolumeClaim';
      } else if (tab === 14 || resource.kind === 'StorageClass') kind = 'StorageClass';
      else if (tab === 15 || resource.kind === 'Node') kind = 'Node';
      else if (tab === 16 || resource.kind === 'ServiceAccount') kind = 'ServiceAccount';
      else if (tab === 17) {
        if (resource.kind === 'ClusterRole' || resource.type === 'clusterrole') kind = 'ClusterRole';
        else kind = 'Role';
      } else if (tab === 18) {
        if (resource.kind === 'ClusterRoleBinding' || resource.type === 'clusterrolebinding') kind = 'ClusterRoleBinding';
        else kind = 'RoleBinding';
      } else if (tab === 19 || resource.kind === 'CustomResourceDefinition') kind = 'CustomResourceDefinition';
      else if (tab === 20 || resource.kind === 'Event') kind = 'Event';
      else if (tab === 21 || resource.kind === 'HorizontalPodAutoscaler') kind = 'HorizontalPodAutoscaler';
      else if (tab === 22 || resource.kind === 'PersistentVolume') kind = 'PersistentVolume';
      else if (tab === 23) kind = resource.kind || 'Gateway';
      else if (tab === 24 || resource.kind === 'AuditLogEntry') kind = 'AuditLogEntry';

      let out = `Name:                   ${name}\n`;
      if (namespace && !['Node', 'StorageClass', 'ClusterRole', 'ClusterRoleBinding', 'CustomResourceDefinition', 'PersistentVolume'].includes(kind)) {
        out += `Namespace:              ${namespace}\n`;
      }
      out += `CreationTimestamp:      ${creationTimestamp}\n`;
      out += `Labels:                 ${labels}\n`;
      out += `Annotations:            ${annotations}\n`;

      if (kind === 'Deployment') {
        const desired = resource.replicas || resource.desired || 1;
        out += `Selector:               app=${name}\n`;
        out += `Replicas:               ${desired} desired | ${desired} updated | ${desired} total | ${desired} available | 0 unavailable\n`;
        out += `StrategyType:           RollingUpdate\n`;
        out += `MinReadySeconds:        0\n`;
        out += `RollingUpdateStrategy:  25% max unavailable, 25% max surge\n`;
        out += `Pod Template:\n`;
        out += `  Labels:       app=${name}\n`;
        out += `  Containers:\n`;
        out += `   app:\n`;
        out += `    Image:      ${resource.image || resource.images || 'ghcr.io/app:latest'}\n`;
        out += `    Port:       8080/TCP\n`;
        out += `    Host Port:  0/TCP\n`;
        out += `Conditions:\n`;
        out += `  Type           Status  Reason\n`;
        out += `  ----           ------  ------\n`;
        out += `  Available      True    MinimumReplicasAvailable\n`;
        out += `  Progressing    True    NewReplicaSetAvailable\n`;
        out += `OldReplicaSets:  <none>\n`;
        out += `NewReplicaSet:   ${name}-7d9b48f8bc (${desired}/${desired} replicas created)\n`;
      } else if (kind === 'Pod') {
        out += `Status:                 ${typeof resource.status === 'string' ? resource.status : resource.status?.phase || 'Running'}\n`;
        out += `IP:                     ${resource.ip || '10.244.0.15'}\n`;
        out += `Node:                   ${resource.node || 'worker-node-1'}\n`;
        if (resource.cpuUsage || resource.memoryUsage) {
          out += `Metrics:                CPU: ${resource.cpuUsage || '<10m'} | Mem: ${resource.memoryUsage || '<64Mi'}\n`;
        }
        out += `Containers:\n`;
        if (Array.isArray(resource.containers) && resource.containers.length > 0) {
          resource.containers.forEach((c: string) => {
            out += `  ${c}:\n`;
            out += `    Image:              ${resource.image || 'nginx:latest'}\n`;
            out += `    Ready:              ${resource.ready || 'True'}\n`;
            out += `    Restart Count:      ${resource.restarts ?? 0}\n`;
          });
        } else {
          out += `  app:\n`;
          out += `    Image:              ${resource.image || 'nginx:latest'}\n`;
          out += `    Ready:              ${resource.ready || 'True'}\n`;
          out += `    Restart Count:      ${resource.restarts ?? 0}\n`;
        }
        out += `Conditions:\n`;
        out += `  Type              Status\n`;
        out += `  Initialized       True\n`;
        out += `  Ready             True\n`;
        out += `  ContainersReady   True\n`;
        out += `  PodScheduled      True\n`;
      } else if (kind === 'HorizontalPodAutoscaler') {
        out += `Reference:              ${resource.reference || 'Deployment/' + name}\n`;
        out += `Targets:                ${resource.targets || '<unknown>'}\n`;
        out += `Min Replicas:           ${resource.minReplicas ?? 1}\n`;
        out += `Max Replicas:           ${resource.maxReplicas ?? 10}\n`;
        out += `Replicas:               ${resource.replicas ?? 1} current / ${resource.desiredReplicas ?? 1} desired\n`;
      } else if (kind === 'PersistentVolume') {
        out += `Capacity:               ${resource.capacity || '10Gi'}\n`;
        out += `Access Modes:           ${resource.accessModes || 'RWO'}\n`;
        out += `Reclaim Policy:         ${resource.reclaimPolicy || 'Retain'}\n`;
        out += `Status:                 ${resource.status || 'Bound'}\n`;
        out += `Claim:                  ${resource.claim || '<none>'}\n`;
        out += `StorageClass:           ${resource.storageClass || 'standard'}\n`;
      } else if (kind === 'Gateway') {
        out += `Class:                  ${resource.gatewayClassName || 'istio'}\n`;
        out += `Listeners:              ${resource.listeners ? JSON.stringify(resource.listeners) : '80/HTTP'}\n`;
        out += `Addresses:              ${resource.addresses?.join(', ') || '<pending>'}\n`;
        out += `Status:                 ${resource.status || 'Programmed'}\n`;
      } else if (kind === 'HTTPRoute') {
        out += `Hostnames:              ${resource.hostnames?.join(', ') || '*'}\n`;
        out += `ParentRefs:             ${resource.parentRefs ? JSON.stringify(resource.parentRefs) : 'default-gateway'}\n`;
        out += `Rules:                  ${resource.rulesCount ?? 1} rules configured\n`;
      } else if (kind === 'DaemonSet') {
        out += `Selector:               name=${name}\n`;
        out += `Number of Nodes:        ${resource.desired || resource.ready || 3} desired | ${resource.ready || 3} current | ${resource.ready || 3} ready\n`;
        out += `Pod Template:\n`;
        out += `  Containers:\n`;
        out += `   daemon:      Image: ${resource.image || 'fluentd:latest'}\n`;
      } else if (kind === 'StatefulSet') {
        out += `Selector:               app=${name}\n`;
        out += `Replicas:               ${resource.replicas || 3} desired\n`;
        out += `Pod Template:\n`;
        out += `  Containers:\n`;
        out += `   stateful-app: Image: ${resource.image || 'redis:7.0'}\n`;
      } else if (kind === 'Service') {
        out += `Type:                   ${resource.type || 'ClusterIP'}\n`;
        out += `IP:                     ${resource.clusterIP || '10.96.0.1'}\n`;
        out += `Port:                   ${resource.ports || '80/TCP'}\n`;
        out += `Endpoints:              ${resource.endpoints || '10.244.0.12:80'}\n`;
      } else if (kind === 'Node') {
        out += `InternalIP:             ${resource.ip || '192.168.1.100'}\n`;
        out += `OS Image:               Ubuntu 22.04 LTS\n`;
        out += `Container Runtime:      containerd://1.6.24\n`;
        out += `Kubelet Version:        v1.28.2\n`;
      } else if (kind === 'AuditLogEntry') {
        out += `Operator:               ${resource.user || 'admin'}\n`;
        out += `Action:                 ${resource.action || 'OPERATION'}\n`;
        out += `Resource:               ${resource.resourceType}/${resource.resourceName}\n`;
        out += `Namespace:              ${resource.namespace || 'default'}\n`;
        out += `Status:                 ${resource.status || 'SUCCESS'}\n`;
        out += `Details:                ${resource.details || '-'}\n`;
      } else if (kind === 'HelmRelease' || tab === 25) {
        out += `Chart:                  ${resource.chart || '<unknown>'}\n`;
        out += `Chart Version:          ${resource.chartVersion || '<unknown>'}\n`;
        out += `App Version:            ${resource.appVersion || '<unknown>'}\n`;
        out += `Revision:               ${resource.revision ?? 1}\n`;
        out += `Status:                 ${resource.status || 'deployed'}\n`;
        out += `Updated:                ${resource.updated || resource.age || '<unknown>'}\n`;
        out += `Description:            ${resource.description || 'Helm release managed deployment'}\n`;
      }

      const matchingEvents = (Array.isArray(events) ? events : []).filter((e) => {
        if (!e) return false;
        const objStr = typeof e.object === 'string' ? e.object : typeof e.object === 'object' && e.object ? JSON.stringify(e.object) : '';
        const msgStr = typeof e.message === 'string' ? e.message : '';
        return objStr.includes(name) || msgStr.includes(name);
      });

      out += `Events:\n`;
      if (matchingEvents.length > 0) {
        out += `  Type     Reason               Age   From                     Message\n`;
        out += `  ----     ------               ----  ----                     -------\n`;
        matchingEvents.slice(0, 4).forEach((ev) => {
          const typeStr = String(ev.type || 'Normal').padEnd(8);
          const reasonStr = String(ev.reason || 'Updated').padEnd(20);
          const ageStr = String(ev.lastSeen || (ev as any).age || '5m').padEnd(5);
          const rawSource = (ev as any).source;
          const fromStr = String(typeof rawSource === 'object' && rawSource ? rawSource.component || 'controller' : rawSource || 'controller').padEnd(24);
          out += `  ${typeStr} ${reasonStr} ${ageStr} ${fromStr} ${ev.message || ''}\n`;
        });
      } else {
        out += `  Type    Reason              Age   From                   Message\n`;
        out += `  ----    ------              ----  ----                   -------\n`;
        out += `  Normal  ScalingReplicaSet   ${age}   deployment-controller  Scaled up replica set ${name}\n`;
        out += `  Normal  Scheduled           ${age}   default-scheduler      Successfully assigned to node\n`;
      }

      return out;
    } catch (err) {
      console.error('Error formatting describe output:', err);
      return `Name: ${resource?.name || resource?.object || 'unknown'}\nNamespace: ${resource?.namespace || 'default'}\nStatus: ${typeof resource?.status === 'string' ? resource.status : 'Active'}`;
    }
  };

  const getResourceType = (resource: any, tab: number): string => {
    if (!resource) {
      const defaultTypes = [
        'overview', 'pods', 'deployments', 'daemonsets', 'statefulsets',
        'replicasets', 'jobs', 'cronjobs', 'services', 'ingresses', 'networkpolicies',
        'configmaps', 'secrets', 'persistentvolumeclaims', 'storageclasses',
        'nodes', 'serviceaccounts', 'roles', 'rolebindings', 'customresourcedefinitions', 'events'
      ];
      return defaultTypes[tab] || 'pods';
    }

    const kind = (resource.kind || resource.type || '').toLowerCase();
    if (kind.includes('daemonset')) return 'daemonsets';
    if (kind.includes('statefulset')) return 'statefulsets';
    if (kind.includes('replicaset')) return 'replicasets';
    if (kind.includes('cronjob')) return 'cronjobs';
    if (kind === 'job' || kind.includes('jobs')) return 'jobs';
    if (kind.includes('deployment')) return 'deployments';
    if (kind.includes('pod')) return 'pods';
    if (kind.includes('serviceaccount')) return 'serviceaccounts';
    if (kind.includes('rolebinding') || kind === 'rolebinding') return 'rolebindings';
    if (kind.includes('role') || kind === 'role') return 'roles';
    if (kind.includes('persistentvolumeclaim') || kind === 'pvc') return 'persistentvolumeclaims';
    if (kind.includes('persistentvolume') || kind === 'pv') return 'persistentvolumes';
    if (kind.includes('storageclass')) return 'storageclasses';
    if (kind.includes('customresourcedefinition') || kind === 'crd') return 'customresourcedefinitions';
    if (kind.includes('node')) return 'nodes';
    if (kind.includes('ingress')) return 'ingresses';
    if (kind.includes('networkpolicy')) return 'networkpolicies';
    if (kind.includes('configmap')) return 'configmaps';
    if (kind.includes('secret')) return 'secrets';
    if (kind.includes('service')) return 'services';
    if (kind.includes('helmrelease') || kind === 'helm' || tab === 25) return 'helmreleases';

    switch (tab) {
      case 1: return 'pods';
      case 2: return 'deployments';
      case 3: return 'daemonsets';
      case 4: return 'statefulsets';
      case 5: return 'replicasets';
      case 6: return 'jobs';
      case 7: return 'cronjobs';
      case 8: return 'services';
      case 9: return 'ingresses';
      case 10: return 'networkpolicies';
      case 11: return 'configmaps';
      case 12: return 'secrets';
      case 13: return 'persistentvolumeclaims';
      case 14: return 'storageclasses';
      case 15: return 'nodes';
      case 16: return 'serviceaccounts';
      case 17: return 'roles';
      case 18: return 'rolebindings';
      case 19: return 'customresourcedefinitions';
      case 20: return 'events';
      case 21: return 'horizontalpodautoscalers';
      case 22: return 'persistentvolumes';
      case 23: return 'gateways';
      case 24: return 'audit';
      case 25: return 'helmreleases';
      default: return 'pods';
    }
  };

  const handleToggleSecretDecode = () => {
    if (!yamlContent) return;
    try {
      if (!secretDecoded) {
        // Decode base64 values under data: in YAML
        const lines = yamlContent.split('\n');
        let inData = false;
        let indent = 0;
        const newLines = lines.map(line => {
          if (/^(\s*)data:\s*$/.test(line)) {
            inData = true;
            indent = line.match(/^(\s*)/)![1].length;
            return line;
          }
          if (inData) {
            const match = line.match(/^(\s+)([\w.\-_]+):\s*['"]?([A-Za-z0-9+/=]+)['"]?\s*$/);
            if (match && match[1].length > indent) {
              try {
                const decoded = atob(match[3]);
                return `${match[1]}${match[2]}: "${decoded}"`;
              } catch {
                return line;
              }
            }
            if (/^\S/.test(line) || (line.match(/^(\s*)/)![1].length <= indent && line.trim() !== '')) {
              inData = false;
            }
          }
          return line;
        });
        setYamlContent(newLines.join('\n'));
        setSecretDecoded(true);
      } else {
        // Encode back to base64
        const lines = yamlContent.split('\n');
        let inData = false;
        let indent = 0;
        const newLines = lines.map(line => {
          if (/^(\s*)data:\s*$/.test(line)) {
            inData = true;
            indent = line.match(/^(\s*)/)![1].length;
            return line;
          }
          if (inData) {
            const match = line.match(/^(\s+)([\w.\-_]+):\s*["']?(.*?)["']?\s*$/);
            if (match && match[1].length > indent) {
              try {
                const encoded = btoa(match[3]);
                return `${match[1]}${match[2]}: ${encoded}`;
              } catch {
                return line;
              }
            }
            if (/^\S/.test(line) || (line.match(/^(\s*)/)![1].length <= indent && line.trim() !== '')) {
              inData = false;
            }
          }
          return line;
        });
        setYamlContent(newLines.join('\n'));
        setSecretDecoded(false);
      }
    } catch (err) {
      console.error('Failed to toggle secret decoding', err);
    }
  };

  const handleOpenYaml = async (resourceOverride?: any) => {
    const resource = resourceOverride || selectedResource;
    if (!resource) return;
    setSelectedResource(resource);
    setYamlDialogOpen(true);
    setYamlLoading(true);
    setYamlContent('');
    setSecretDecoded(false);

    const type = getResourceType(resource, activeTab);
    const namespace = resource.namespace || selectedNamespace || 'default';

    try {
      const yaml = await fetchResourceYaml(id, type, resource.name, namespace);
      setYamlContent(yaml);
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to fetch YAML.');
      setYamlDialogOpen(false);
    } finally {
      setYamlLoading(false);
    }
  };

  const handleSaveYaml = async () => {
    if (!selectedResource) return;
    setYamlLoading(true);
    const type = getResourceType(selectedResource, activeTab);
    const namespace = selectedResource.namespace || selectedNamespace || 'default';
    try {
      await updateResourceYaml(id, type, selectedResource.name, namespace, yamlContent);
      setToastSeverity('success');
      setToastMessage('Resource manifest updated successfully.');
      setYamlDialogOpen(false);
      handleRefreshAll();
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to update manifest.');
    } finally {
      setYamlLoading(false);
    }
  };

  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yamlContent);
      setYamlCopied(true);
      setTimeout(() => setYamlCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy YAML manifest', err);
    }
  };

  const handleOpenScale = (resourceOverride?: any) => {
    const resource = resourceOverride || selectedResource;
    if (!resource) return;
    setSelectedResource(resource);
    setScaleReplicas(resource.replicas || 1);
    setScaleDialogOpen(true);
  };

  const handleApplyScale = async () => {
    if (!selectedResource) return;
    setScaleLoading(true);
    try {
      const ns = selectedResource.namespace || (selectedNamespace !== 'all' ? selectedNamespace : 'default');
      const rType = selectedResource.kind || (activeTab === 4 ? 'statefulsets' : activeTab === 5 ? 'replicasets' : 'deployments');
      await scaleDeployment(id, selectedResource.name, ns, scaleReplicas, rType);
      setToastSeverity('success');
      setToastMessage(`Scaled ${selectedResource.name} to ${scaleReplicas} replicas.`);
      setScaleDialogOpen(false);
      refetchDeployments();
      refetchStatefulSets();
      refetchReplicaSets();
      refetchPods();
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to scale resource.');
    } finally {
      setScaleLoading(false);
    }
  };

  const handleOpenRestart = (resourceOverride?: any) => {
    const resource = resourceOverride || selectedResource;
    if (!resource) return;
    setSelectedResource(resource);
    setRestartDialogOpen(true);
  };

  const handleApplyRestart = async () => {
    if (!selectedResource) return;
    setRestartLoading(true);
    try {
      await restartPod(id, selectedResource.name, selectedResource.namespace);
      setToastSeverity('success');
      setToastMessage(`Pod ${selectedResource.name} restart request initiated.`);
      setRestartDialogOpen(false);
      refetchPods();
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to restart pod.');
    } finally {
      setRestartLoading(false);
    }
  };

  const handleOpenExec = (resourceOverride?: any) => {
    const resource = resourceOverride || selectedResource;
    if (!resource) return;
    setSelectedResource(resource);
    if (settingsDialogOpen) setSettingsDialogOpen(false);

    let targetName = resource.name;
    let targetType: 'pod' | 'node' = 'pod';
    let targetNamespace = resource.namespace || (selectedNamespace !== 'all' ? selectedNamespace : 'default');
    let targetContainer = selectedContainer || (resource.containers && resource.containers.length > 0 ? resource.containers[0] : '');

    if (activeTab === 14 || resource.kind === 'Node' || (!resource.namespace && resource.ip)) {
      targetType = 'node';
      targetNamespace = 'default';
      targetContainer = '';
    } else if (activeTab === 1 || resource.kind === 'Pod') {
      targetType = 'pod';
    } else {
      const namespace = resource.namespace || (selectedNamespace !== 'all' ? selectedNamespace : undefined);
      const matchingPod = pods.find(
        (p) => (!namespace || p.namespace === namespace) && p.name.startsWith(resource.name) && (p.status === 'Running' || p.status === 'Ready')
      ) || pods.find(
        (p) => (!namespace || p.namespace === namespace) && p.name.startsWith(resource.name)
      );

      if (matchingPod) {
        targetName = matchingPod.name;
        targetType = 'pod';
        targetNamespace = matchingPod.namespace || resource.namespace || 'default';
        targetContainer = matchingPod.containers && matchingPod.containers.length > 0 ? matchingPod.containers[0] : '';
      } else {
        setToastSeverity('warning');
        setToastMessage(`No active pods found for ${resource.name} to execute terminal.`);
        return;
      }
    }

    const sessionId = `${targetName}:${targetContainer || 'default'}`;

    setExecSessions((prev) => {
      const existing = prev.find((s) => s.id === sessionId);
      if (existing) {
        // If already exists, un-minimize and focus it
        return prev.map((s) => (s.id === sessionId ? { ...s, minimized: false } : s));
      }
      return [
        ...prev,
        {
          id: sessionId,
          resourceName: targetName,
          resourceType: targetType,
          namespace: targetNamespace,
          container: targetContainer || undefined,
          minimized: false,
        },
      ];
    });
    setActiveSessionId(sessionId);
  };

  const handleMinimizeExecSession = (sessionId: string) => {
    setExecSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, minimized: true } : s))
    );
  };

  const handleRestoreExecSession = (sessionId: string) => {
    if (settingsDialogOpen) setSettingsDialogOpen(false);
    setExecSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, minimized: false } : s))
    );
    setActiveSessionId(sessionId);
  };

  const handleToggleExecSession = (sessionId: string) => {
    if (settingsDialogOpen) setSettingsDialogOpen(false);
    setExecSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const nextMinimized = !s.minimized;
          if (!nextMinimized) {
            setActiveSessionId(sessionId);
          }
          return { ...s, minimized: nextMinimized };
        }
        return s;
      })
    );
  };

  const handleCloseExecSession = (sessionId: string) => {
    setExecSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setActiveSessionId((current) => (current === sessionId ? null : current));
  };

  const handleOpenLogs = async (resourceOverride?: any, typeOverride?: string) => {
    const resource = resourceOverride || selectedResource;
    if (!resource) return;
    const rType = typeOverride || getResourceType(resource, activeTab);
    const isWorkload = ['deployments', 'daemonsets', 'statefulsets', 'jobs'].includes(rType);
    setLogsResourceType(isWorkload ? 'deployment' : 'pod');
    setSelectedResource(resource);
    const initialContainer = (resource.containers && resource.containers.length > 0) ? resource.containers[0] : '';
    setSelectedContainer(initialContainer);
    setLogsDialogOpen(true);
    setLogsLoading(true);
    setLogsContent('');
    setLogsSearchQuery('');

    const isPre = logsTimeFrame === 'pre' || logsPrevious;
    const namespace = resource.namespace || selectedNamespace || 'default';
    try {
      let data: any;
      if (rType === 'pods') {
        data = await fetchPodLogs(id, resource.name, namespace, {
          previous: isPre,
          since: !isPre && logsTimeFrame !== 'all' ? logsTimeFrame : undefined,
          container: initialContainer || undefined,
        });
      } else if (rType === 'deployments') {
        try {
          data = await fetchDeploymentLogs(id, resource.name, namespace, {
            previous: isPre,
            since: !isPre && logsTimeFrame !== 'all' ? logsTimeFrame : undefined,
          });
        } catch {
          const matchingPods = pods.filter((p) => (namespace === 'all' || p.namespace === namespace) && p.name.startsWith(resource.name));
          if (matchingPods.length > 0) {
            const podLogsPromises = matchingPods.map(async (p) => {
              try {
                const pData = await fetchPodLogs(id, p.name, p.namespace, {
                  previous: isPre,
                  since: !isPre && logsTimeFrame !== 'all' ? logsTimeFrame : undefined,
                });
                return `==================== [POD: ${p.name}] ====================\n${pData.logs || 'No logs recorded.'}`;
              } catch (err: any) {
                return `==================== [POD: ${p.name}] ====================\nFailed to fetch pod logs: ${err.message}`;
              }
            });
            const allLogs = await Promise.all(podLogsPromises);
            data = { logs: allLogs.join('\n\n') };
          } else {
            data = { logs: `No active replica pods found for deployment "${resource.name}" in namespace "${namespace}".` };
          }
        }
      } else {
        const matchingPods = pods.filter((p) => (namespace === 'all' || p.namespace === namespace) && p.name.startsWith(resource.name));
        if (matchingPods.length > 0) {
          const podLogsPromises = matchingPods.map(async (p) => {
            try {
              const pData = await fetchPodLogs(id, p.name, p.namespace, {
                previous: isPre,
                since: !isPre && logsTimeFrame !== 'all' ? logsTimeFrame : undefined,
              });
              return `==================== [POD: ${p.name}] ====================\n${pData.logs || 'No logs recorded.'}`;
            } catch (err: any) {
              return `==================== [POD: ${p.name}] ====================\nFailed to fetch pod logs: ${err.message}`;
            }
          });
          const allLogs = await Promise.all(podLogsPromises);
          data = { logs: allLogs.join('\n\n') };
        } else {
          data = { logs: `No active pods found for ${rType.slice(0, -1)} "${resource.name}" in namespace "${namespace}".` };
        }
      }
      setLogsContent(data.logs);
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to fetch logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRefreshLogs = async (timeFrameVal?: string, containerVal?: string) => {
    if (!selectedResource) return;
    const tf = timeFrameVal !== undefined ? timeFrameVal : logsTimeFrame;
    const cont = containerVal !== undefined ? containerVal : selectedContainer;
    const isPre = tf === 'pre';
    const resource = selectedResource;
    const rType = getResourceType(resource, activeTab);
    const isWorkload = ['deployments', 'daemonsets', 'statefulsets', 'jobs'].includes(rType);
    setLogsLoading(true);
    const namespace = resource.namespace || selectedNamespace || 'default';
    try {
      let data: any;
      if (rType === 'pods') {
        data = await fetchPodLogs(id, resource.name, namespace, {
          previous: isPre,
          since: !isPre && tf !== 'all' ? tf : undefined,
          container: cont || undefined,
        });
      } else if (rType === 'deployments') {
        try {
          data = await fetchDeploymentLogs(id, resource.name, namespace, {
            previous: isPre,
            since: !isPre && tf !== 'all' ? tf : undefined,
          });
        } catch {
          const matchingPods = pods.filter((p) => (namespace === 'all' || p.namespace === namespace) && p.name.startsWith(resource.name));
          if (matchingPods.length > 0) {
            const podLogsPromises = matchingPods.map(async (p) => {
              try {
                const pData = await fetchPodLogs(id, p.name, p.namespace, {
                  previous: isPre,
                  since: !isPre && tf !== 'all' ? tf : undefined,
                });
                return `==================== [POD: ${p.name}] ====================\n${pData.logs || 'No logs recorded.'}`;
              } catch (err: any) {
                return `==================== [POD: ${p.name}] ====================\nFailed to fetch pod logs: ${err.message}`;
              }
            });
            const allLogs = await Promise.all(podLogsPromises);
            data = { logs: allLogs.join('\n\n') };
          } else {
            data = { logs: `No active replica pods found for deployment "${resource.name}" in namespace "${namespace}".` };
          }
        }
      } else {
        const matchingPods = pods.filter((p) => (namespace === 'all' || p.namespace === namespace) && p.name.startsWith(resource.name));
        if (matchingPods.length > 0) {
          const podLogsPromises = matchingPods.map(async (p) => {
            try {
              const pData = await fetchPodLogs(id, p.name, p.namespace, {
                previous: isPre,
                since: !isPre && tf !== 'all' ? tf : undefined,
              });
              return `==================== [POD: ${p.name}] ====================\n${pData.logs || 'No logs recorded.'}`;
            } catch (err: any) {
              return `==================== [POD: ${p.name}] ====================\nFailed to fetch pod logs: ${err.message}`;
            }
          });
          const allLogs = await Promise.all(podLogsPromises);
          data = { logs: allLogs.join('\n\n') };
        } else {
          data = { logs: `No active pods found for ${rType.slice(0, -1)} "${resource.name}" in namespace "${namespace}".` };
        }
      }
      setLogsContent(data.logs);
      setToastSeverity('success');
      setToastMessage('Logs refreshed successfully.');
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to refresh logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCopyLogs = () => {
    if (!logsContent) return;
    navigator.clipboard.writeText(logsContent);
    setToastSeverity('success');
    setToastMessage('Logs copied to clipboard.');
  };

  const handleOpenDelete = (resourceOverride?: any) => {
    const resource = resourceOverride || selectedResource;
    if (!resource) return;
    setSelectedResource(resource);
    setDeleteDialogOpen(true);
  };

  const handleApplyDelete = async () => {
    if (!selectedResource) return;
    setDeleteLoading(true);
    const type = getResourceType(selectedResource, activeTab);
    const namespace = selectedResource.namespace || selectedNamespace || 'default';
    try {
      await deleteResource(id, type, selectedResource.name, namespace);
      setToastSeverity('success');
      setToastMessage(`Resource ${selectedResource.name} deleted successfully.`);
      setDeleteDialogOpen(false);
      handleRefreshAll();
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to delete resource.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenRollout = (resourceOverride?: any) => {
    const resource = resourceOverride || selectedResource;
    if (!resource) return;
    setSelectedResource(resource);
    setRolloutMode('restart');
    setSelectedRolloutRevision(rolloutRevisions && rolloutRevisions.length > 0 ? rolloutRevisions[0].revision : null);
    setRolloutDialogOpen(true);
  };

  const handleApplyRollout = async () => {
    if (!selectedResource) return;
    setRolloutLoading(true);
    const namespace = selectedResource.namespace || selectedNamespace || 'default';
    try {
      await rolloutDeployment(id, selectedResource.name, namespace);
      setToastSeverity('success');
      if (rolloutMode === 'rollback' && selectedRolloutRevision) {
        setToastMessage(`Rollback to revision #${selectedRolloutRevision} triggered for ${selectedResource.name}.`);
      } else {
        setToastMessage(`Rollout restart triggered for ${selectedResource.name}.`);
      }
      setRolloutDialogOpen(false);
      refetchDeployments();
      refetchDaemonSets();
      refetchStatefulSets();
      refetchRolloutHistory();
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to trigger rollout.');
    } finally {
      setRolloutLoading(false);
    }
  };

  const handleOpenImageDialog = (resourceOverride?: any) => {
    const resource = resourceOverride || selectedResource;
    if (!resource) return;
    setSelectedResource(resource);
    setImageInputVal(resource.image || '');
    setImageDialogOpen(true);
  };

  const handleApplyImageUpdate = async () => {
    if (!selectedResource) return;
    setImageLoading(true);
    const namespace = selectedResource.namespace || selectedNamespace || 'default';
    try {
      await setDeploymentImage(id, selectedResource.name, namespace, imageInputVal);
      setToastSeverity('success');
      setToastMessage(`Updated container image to ${imageInputVal} successfully.`);
      setImageDialogOpen(false);
      refetchDeployments();
      refetchRolloutHistory();
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to update container image.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleOpenHelmValues = async (release: K8sHelmRelease) => {
    setActiveHelmRelease(release);
    setHelmValuesLoading(true);
    setHelmValuesContent('');
    setHelmValuesOpen(true);
    try {
      const values = await fetchHelmReleaseValues(id, release.name, release.namespace);
      setHelmValuesContent(values || '# No custom values found for this release\n');
    } catch (err: any) {
      setToastSeverity('error');
      setToastMessage(err.message || 'Failed to fetch Helm values');
      setHelmValuesContent('# Error retrieving values:\n# ' + (err.message || 'Unknown error'));
    } finally {
      setHelmValuesLoading(false);
    }
  };

  const handleOpenHelmRollback = (release: K8sHelmRelease) => {
    setActiveHelmRelease(release);
    const prevRev = release.revision > 1 ? release.revision - 1 : 1;
    setHelmRollbackRev(prevRev);
    setHelmRollbackOpen(true);
  };

  const handleApplyHelmRollback = async () => {
    if (!activeHelmRelease) return;
    setHelmRollbackLoading(true);
    try {
      const res = await rollbackHelmRelease(id, activeHelmRelease.name, helmRollbackRev, activeHelmRelease.namespace);
      setToastSeverity('success');
      setToastMessage(res.message || `Helm release "${activeHelmRelease.name}" rolled back to revision ${helmRollbackRev}.`);
      setHelmRollbackOpen(false);
      refetchHelmReleases();
      refetchAuditLogs();
    } catch (err: any) {
      setToastSeverity('error');
      setToastMessage(err.message || 'Failed to rollback Helm release');
    } finally {
      setHelmRollbackLoading(false);
    }
  };

  const handleOpenHelmUninstall = (release: K8sHelmRelease) => {
    setActiveHelmRelease(release);
    setHelmUninstallOpen(true);
  };

  const handleApplyHelmUninstall = async () => {
    if (!activeHelmRelease) return;
    setHelmUninstallLoading(true);
    try {
      const res = await uninstallHelmRelease(id, activeHelmRelease.name, activeHelmRelease.namespace);
      setToastSeverity('success');
      setToastMessage(res.message || `Helm release "${activeHelmRelease.name}" uninstalled successfully.`);
      setHelmUninstallOpen(false);
      refetchHelmReleases();
      refetchAuditLogs();
    } catch (err: any) {
      setToastSeverity('error');
      setToastMessage(err.message || 'Failed to uninstall Helm release');
    } finally {
      setHelmUninstallLoading(false);
    }
  };

  const getActiveTabResources = (): any[] => {
    if (activeTab === 0) return [];
    if (activeTab === 1) return filteredPods;
    if (activeTab === 2) return filteredDeployments;
    if (activeTab === 3) return filteredDaemonSets;
    if (activeTab === 4) return filteredStatefulSets;
    if (activeTab === 5) return filteredReplicaSets;
    if (activeTab === 6) return filteredJobs;
    if (activeTab === 7) return filteredCronJobs;
    if (activeTab === 8) return filteredServices;
    if (activeTab === 9) return filteredIngresses;
    if (activeTab === 10) return filteredNetworkPolicies;
    if (activeTab === 11) return filteredConfigMaps;
    if (activeTab === 12) return filteredSecrets;
    if (activeTab === 13) return filteredPVCs;
    if (activeTab === 14) return filteredStorageClasses;
    if (activeTab === 15) return filteredNodes;
    if (activeTab === 16) return filteredServiceAccounts;
    if (activeTab === 17) return filteredRoles;
    if (activeTab === 18) return filteredRoleBindings;
    if (activeTab === 19) return filteredCRDs;
    if (activeTab === 20) return filteredEvents;
    if (activeTab === 21) return filteredHPAs;
    if (activeTab === 22) return filteredPVs;
    if (activeTab === 23) return [...filteredGateways, ...filteredHTTPRoutes];
    if (activeTab === 24) return filteredAuditLogs;
    if (activeTab === 25) return filteredHelmReleases;
    return [];
  };

  const isRowSelected = (res: any) => {
    return selectedResources.some((r) => (r.name || r.id) === (res.name || res.id) && r.namespace === res.namespace);
  };

  const handleToggleRowSelect = (res: any) => {
    handleToggleSelect(res);
  };

  const handleSelectAllRows = (checked: boolean, list: any[]) => {
    if (checked) {
      setSelectedResources(list);
    } else {
      setSelectedResources([]);
    }
  };

  const handleToggleSelect = (resource: any) => {
    const resName = resource.name || resource.id;
    setSelectedResources((prev) => {
      const exists = prev.some((r) => (r.name || r.id) === resName && r.namespace === resource.namespace);
      if (exists) {
        return prev.filter((r) => !((r.name || r.id) === resName && r.namespace === resource.namespace));
      } else {
        return [...prev, resource];
      }
    });
  };

  const handleToggleSelectAll = () => {
    const resources = getActiveTabResources();
    const allSelected = resources.length > 0 && resources.every((r: any) =>
      selectedResources.some((sr: any) => (sr.name || sr.id) === (r.name || r.id) && sr.namespace === r.namespace)
    );
    if (allSelected) {
      setSelectedResources((prev) =>
        prev.filter((sr: any) =>
          !resources.some((r: any) => (r.name || r.id) === (sr.name || sr.id) && r.namespace === sr.namespace)
        )
      );
    } else {
      setSelectedResources((prev) => {
        const newSelections = resources.filter((r: any) =>
          !prev.some((sr: any) => (sr.name || sr.id) === (r.name || r.id) && sr.namespace === r.namespace)
        );
        return [...prev, ...newSelections];
      });
    }
  };

  const handleOpenBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const handleApplyBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const deletePromises = selectedResources.map((res) => {
        const type = getResourceType(res, activeTab);
        return deleteResource(id, type, res.name, res.namespace || selectedNamespace || 'default');
      });
      await Promise.all(deletePromises);
      setToastSeverity('success');
      setToastMessage(`Successfully deleted ${selectedResources.length} resources.`);
      setSelectedResources([]);
      setBulkDeleteDialogOpen(false);
      handleRefreshAll();
    } catch (e: any) {
      setToastSeverity('error');
      setToastMessage(e.message || 'Failed to delete some selected resources.');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const filteredDeployments = useMemo(() => {
    return (deployments || []).filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [deployments, searchQuery]);

  const filteredServices = useMemo(() => {
    return (services || []).filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [services, searchQuery]);

  const filteredPods = useMemo(() => {
    return (pods || []).filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [pods, searchQuery]);

  const filteredIngresses = useMemo(() => {
    return (ingresses || []).filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [ingresses, searchQuery]);

  const filteredConfigMaps = useMemo(() => {
    return (configMaps || []).filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [configMaps, searchQuery]);

  const filteredSecrets = useMemo(() => {
    return (secrets || []).filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [secrets, searchQuery]);

  const filteredNodes = useMemo(() => {
    return (nodes || []).filter((n) => n.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [nodes, searchQuery]);

  const filteredEvents = useMemo(() => {
    return (events || []).filter((e) =>
      e.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.object.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  const filteredDaemonSets = useMemo(() => {
    return (daemonSets || []).filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [daemonSets, searchQuery]);

  const filteredStatefulSets = useMemo(() => {
    return (statefulSets || []).filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [statefulSets, searchQuery]);

  const filteredReplicaSets = useMemo(() => {
    return (replicaSets || []).filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [replicaSets, searchQuery]);

  const filteredCronJobs = useMemo(() => {
    return (cronJobs || []).filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [cronJobs, searchQuery]);

  const filteredJobs = useMemo(() => {
    return (jobs || []).filter((j) => j.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [jobs, searchQuery]);

  const filteredNetworkPolicies = useMemo(() => {
    return (networkPolicies || []).filter((np) => np.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [networkPolicies, searchQuery]);

  const filteredPVCs = useMemo(() => {
    return (pvcs || []).filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [pvcs, searchQuery]);

  const filteredStorageClasses = useMemo(() => {
    return (storageClasses || []).filter((sc) => sc.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [storageClasses, searchQuery]);

  const filteredServiceAccounts = useMemo(() => {
    return (serviceAccounts || []).filter((sa) => sa.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [serviceAccounts, searchQuery]);

  const filteredRoles = useMemo(() => {
    return (roles || []).filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [roles, searchQuery]);

  const filteredRoleBindings = useMemo(() => {
    return (roleBindings || []).filter((rb) => rb.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [roleBindings, searchQuery]);

  const filteredCRDs = useMemo(() => {
    return (crds || []).filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [crds, searchQuery]);

  const filteredPVs = useMemo(() => {
    return (pvs || []).filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [pvs, searchQuery]);

  const filteredHPAs = useMemo(() => {
    return (hpas || []).filter((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [hpas, searchQuery]);

  const filteredGateways = useMemo(() => {
    return (gateways || []).filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [gateways, searchQuery]);

  const filteredHTTPRoutes = useMemo(() => {
    return (httpRoutes || []).filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [httpRoutes, searchQuery]);

  const filteredAuditLogs = useMemo(() => {
    return (auditLogs || []).filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        (log.resourceName && log.resourceName.toLowerCase().includes(q)) ||
        (log.user && log.user.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.details && log.details.toLowerCase().includes(q));
      const matchesAction = auditActionFilter === 'all' || log.action === auditActionFilter;
      return matchesSearch && matchesAction;
    });
  }, [auditLogs, searchQuery, auditActionFilter]);

  const filteredHelmReleases = useMemo(() => {
    return (helmReleases || []).filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        !searchQuery ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.chart && r.chart.toLowerCase().includes(q)) ||
        (r.namespace && r.namespace.toLowerCase().includes(q)) ||
        (r.appVersion && r.appVersion.toLowerCase().includes(q))
      );
    });
  }, [helmReleases, searchQuery]);

  const getActiveTabFilteredResources = (): any[] => {
    if (activeTab === 0) return [];
    if (activeTab === 1) return filteredPods;
    if (activeTab === 2) return filteredDeployments;
    if (activeTab === 3) return filteredDaemonSets;
    if (activeTab === 4) return filteredStatefulSets;
    if (activeTab === 5) return filteredReplicaSets;
    if (activeTab === 6) return filteredJobs;
    if (activeTab === 7) return filteredCronJobs;
    if (activeTab === 8) return filteredServices;
    if (activeTab === 9) return filteredIngresses;
    if (activeTab === 10) return filteredNetworkPolicies;
    if (activeTab === 11) return filteredConfigMaps;
    if (activeTab === 12) return filteredSecrets;
    if (activeTab === 13) return filteredPVCs;
    if (activeTab === 14) return filteredStorageClasses;
    if (activeTab === 15) return filteredNodes;
    if (activeTab === 16) return filteredServiceAccounts;
    if (activeTab === 17) return filteredRoles;
    if (activeTab === 18) return filteredRoleBindings;
    if (activeTab === 19) return filteredCRDs;
    if (activeTab === 20) return filteredEvents;
    if (activeTab === 21) return filteredHPAs;
    if (activeTab === 22) return filteredPVs;
    if (activeTab === 23) return [...filteredGateways, ...filteredHTTPRoutes];
    if (activeTab === 24) return filteredAuditLogs;
    if (activeTab === 25) return filteredHelmReleases;
    return [];
  };

  const paginate = <T,>(items: T[]): T[] => {
    const start = page * rowsPerPage;
    return items.slice(start, start + rowsPerPage);
  };

  const handleNamespaceChange = (ns: string) => {
    setSelectedNamespace(ns);
    if (activeTab === 0) {
      setActiveTab(1); // Auto-switch from Overview to Pods tab on namespace selection
    }
  };

  const filteredLogsLines = useMemo(() => {
    if (!logsContent) return [];
    const lines = logsContent.split('\n');
    if (!logsSearchQuery.trim()) return lines;
    const query = logsSearchQuery.toLowerCase();
    return lines.filter((line) => line.toLowerCase().includes(query));
  }, [logsContent, logsSearchQuery]);

  const displayLogsContent = useMemo(() => {
    return filteredLogsLines.join('\n');
  }, [filteredLogsLines]);

  const formatLogTimestamp = (timestampStr: string, mode: 'local' | 'utc'): string => {
    try {
      const d = new Date(timestampStr);
      if (isNaN(d.getTime())) return timestampStr;

      if (mode === 'utc') {
        return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
      }

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const millis = String(d.getMilliseconds()).padStart(3, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
    } catch {
      return timestampStr;
    }
  };

  const renderEnhancedLogLine = (
    rawLine: string,
    searchQuery: string,
    timeMode: 'local' | 'utc'
  ) => {
    const line = rawLine;

    // Pod multi-container / deployment header styling
    if (line.startsWith('==================== [POD:')) {
      return (
        <Box
          sx={{
            color: isDark ? '#38bdf8' : '#0284c7',
            fontWeight: 800,
            py: 0.4,
            bgcolor: isDark ? 'rgba(56,189,248,0.1)' : '#e0f2fe',
            px: 1,
            borderRadius: 1,
            my: 0.6,
            border: isDark ? '1px solid rgba(56,189,248,0.2)' : '1px solid #bae6fd',
          }}
        >
          {line}
        </Box>
      );
    }

    // Detect leading RFC3339 / ISO timestamp: e.g. "2026-08-15T05:08:18.123456789Z" or "2026-08-15 05:08:18.123"
    const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+(.*)$/);
    let timestampEl: React.ReactNode = null;
    let restOfLine = line;

    if (tsMatch) {
      const originalTs = tsMatch[1];
      restOfLine = tsMatch[2];
      const displayTs = formatLogTimestamp(originalTs, timeMode);
      timestampEl = (
        <Box
          component="span"
          sx={{
            color: isDark ? '#64748b' : '#64748b',
            pr: 1.5,
            userSelect: 'none',
            fontFamily: 'monospace',
            fontSize: '0.76rem',
            flexShrink: 0,
          }}
        >
          {displayTs}
        </Box>
      );
    }

    // Token regex for log levels and common HTTP verbs
    const tokenRegex = /\b(ERROR|FATAL|PANIC|CRITICAL|EXCEPTION|WARN|WARNING|INFO|NOTICE|DEBUG|TRACE|GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/gi;

    const renderLevelTokens = (segment: string, keyPrefix: string) => {
      const parts = segment.split(tokenRegex);
      return parts.map((token, idx) => {
        const upper = token.toUpperCase();
        let color: string | null = null;
        let bgcolor: string | null = null;

        if (['ERROR', 'FATAL', 'PANIC', 'CRITICAL', 'EXCEPTION'].includes(upper)) {
          color = isDark ? '#f87171' : '#dc2626';
          bgcolor = isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2';
        } else if (['WARN', 'WARNING'].includes(upper)) {
          color = isDark ? '#fbbf24' : '#d97706';
          bgcolor = isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7';
        } else if (['INFO', 'NOTICE'].includes(upper)) {
          color = isDark ? '#38bdf8' : '#0284c7';
        } else if (['DEBUG', 'TRACE'].includes(upper)) {
          color = isDark ? '#a78bfa' : '#7c3aed';
        } else if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(upper)) {
          color = isDark ? '#34d399' : '#059669';
          bgcolor = isDark ? 'rgba(52, 211, 153, 0.12)' : '#d1fae5';
        }

        if (color) {
          return (
            <Box
              component="span"
              key={`${keyPrefix}-${idx}`}
              sx={{
                color,
                bgcolor: bgcolor || 'transparent',
                px: bgcolor ? 0.6 : 0,
                py: bgcolor ? 0.05 : 0,
                borderRadius: 0.8,
                fontWeight: 750,
              }}
            >
              {token}
            </Box>
          );
        }
        return token;
      });
    };

    const renderTokens = (text: string) => {
      if (searchQuery.trim()) {
        const qRegex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(qRegex);
        return parts.map((part, i) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <Box
              component="mark"
              key={i}
              sx={{
                bgcolor: isDark ? 'rgba(234, 179, 8, 0.35)' : 'rgba(250, 204, 21, 0.4)',
                color: isDark ? '#fde047' : '#854d0e',
                borderRadius: '2px',
                px: '3px',
                fontWeight: 800,
              }}
            >
              {part}
            </Box>
          ) : (
            renderLevelTokens(part, `q-${i}`)
          )
        );
      }
      return renderLevelTokens(text, 'base');
    };

    return (
      <Box sx={{ py: 0.1, display: 'flex', alignItems: 'flex-start', fontFamily: 'inherit' }}>
        {timestampEl}
        <Box component="span" sx={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {renderTokens(restOfLine)}
        </Box>
      </Box>
    );
  };

  const handleDownloadLogs = () => {
    const textToDownload = logsContent || displayLogsContent;
    if (!textToDownload) return;
    const element = document.createElement('a');
    const file = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const resName = selectedResource?.name || 'resource';
    const contSuffix = selectedContainer ? `-${selectedContainer}` : '';
    element.download = `${resName}${contSuffix}-logs.log`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const handleDownloadYaml = () => {
    if (!yamlContent) return;
    const element = document.createElement('a');
    const file = new Blob([yamlContent], { type: 'text/yaml' });
    element.href = URL.createObjectURL(file);
    element.download = `${selectedResource?.name || 'manifest'}.yaml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const [logsCopied, setLogsCopied] = useState(false);
  const handleCopyLogsWithFeedback = async () => {
    try {
      const textToCopy = logsContent || displayLogsContent;
      if (!textToCopy) return;
      await navigator.clipboard.writeText(textToCopy);
      setLogsCopied(true);
      setTimeout(() => setLogsCopied(false), 2000);
    } catch (e) { }
  };

  const handleDisconnectCluster = async () => {
    if (!clusterMeta?.id) return;
    const ok = window.confirm(`Disconnect cluster "${clusterMeta.name}" from NextKube?`);
    if (!ok) return;

    try {
      await disconnectCluster(clusterMeta.id);
      await queryClient.invalidateQueries({ queryKey: ['clustersList'] });
      setToastSeverity('info');
      setToastMessage(`Cluster "${clusterMeta.name}" disconnected.`);
    } catch (err: any) {
      setToastSeverity('error');
      setToastMessage(err.message || 'Failed to disconnect cluster.');
    }
  };

  const renderRowActionCell = (resource: any, tab: number) => {
    return (
      <TableCell
        align="right"
        sx={{ pr: 1.5, py: 0.75, whiteSpace: 'nowrap', width: '1%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
          {/* Tab 1: Pods -> Logs + Terminal */}
          {tab === 1 && (
            <>
              <Tooltip title="View Logs">
                <IconButton
                  size="small"
                  onClick={() => handleOpenLogs(resource, 'pods')}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
                >
                  <ReceiptLongIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Exec Shell">
                <IconButton
                  size="small"
                  onClick={() => handleOpenExec(resource)}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'info.main', bgcolor: 'action.hover' } }}
                >
                  <TerminalIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Tab 2: Deployments -> Scale + Logs */}
          {tab === 2 && (
            <>
              <Tooltip title="Scale Replicas">
                <IconButton
                  size="small"
                  onClick={() => handleOpenScale(resource)}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
                >
                  <TuneIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Deployment Logs">
                <IconButton
                  size="small"
                  onClick={() => handleOpenLogs(resource, 'deployments')}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'info.main', bgcolor: 'action.hover' } }}
                >
                  <ReceiptLongIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Tab 3: DaemonSets -> Logs + Terminal */}
          {tab === 3 && (
            <>
              <Tooltip title="DaemonSet Logs">
                <IconButton
                  size="small"
                  onClick={() => handleOpenLogs(resource, 'daemonsets')}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
                >
                  <ReceiptLongIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Terminal Exec">
                <IconButton
                  size="small"
                  onClick={() => handleOpenExec(resource)}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'info.main', bgcolor: 'action.hover' } }}
                >
                  <TerminalIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Tab 4: StatefulSets -> Scale + Logs */}
          {tab === 4 && (
            <>
              <Tooltip title="Scale Replicas">
                <IconButton
                  size="small"
                  onClick={() => handleOpenScale(resource)}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
                >
                  <TuneIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="StatefulSet Logs">
                <IconButton
                  size="small"
                  onClick={() => handleOpenLogs(resource, 'statefulsets')}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'info.main', bgcolor: 'action.hover' } }}
                >
                  <ReceiptLongIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Tab 5: ReplicaSets -> Scale */}
          {tab === 5 && (
            <Tooltip title="Scale Replicas">
              <IconButton
                size="small"
                onClick={() => handleOpenScale(resource)}
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
              >
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Tab 6: Jobs -> Logs + Terminal */}
          {tab === 6 && (
            <>
              <Tooltip title="Job Logs">
                <IconButton
                  size="small"
                  onClick={() => handleOpenLogs(resource, 'jobs')}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
                >
                  <ReceiptLongIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Terminal Exec">
                <IconButton
                  size="small"
                  onClick={() => handleOpenExec(resource)}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'info.main', bgcolor: 'action.hover' } }}
                >
                  <TerminalIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Tab 7: CronJobs -> Logs */}
          {tab === 7 && (
            <Tooltip title="CronJob Logs">
              <IconButton
                size="small"
                onClick={() => handleOpenLogs(resource, 'cronjobs')}
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
              >
                <ReceiptLongIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Tab 15: Nodes -> SSH Terminal */}
          {tab === 15 && (
            <Tooltip title="Node SSH Terminal">
              <IconButton
                size="small"
                onClick={() => handleOpenExec(resource)}
                sx={{ color: 'text.secondary', '&:hover': { color: 'info.main', bgcolor: 'action.hover' } }}
              >
                <TerminalIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Tab 20: Events -> Describe */}
          {tab === 20 && (
            <Tooltip title="Describe Event">
              <IconButton
                size="small"
                onClick={() => handleOpenDescribe(resource, 20)}
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
              >
                <DescriptionOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Tab 24: Audit Logs -> View Details */}
          {tab === 24 && (
            <Tooltip title="View Details">
              <IconButton
                size="small"
                onClick={() => handleOpenDescribe(resource, 24)}
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
              >
                <DescriptionOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Tab 25: Helm Releases -> Inspect Values */}
          {tab === 25 && (
            <Tooltip title="Inspect Values (values.yaml)">
              <IconButton
                size="small"
                onClick={() => handleOpenHelmValues(resource)}
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
              >
                <CodeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Standard Resources: Tabs 5, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23 -> 1-click View/Edit YAML */}
          {[5, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23].includes(tab) && (
            <Tooltip title="View / Edit YAML">
              <IconButton
                size="small"
                onClick={() => handleOpenYaml(resource)}
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
              >
                <CodeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* 3-dot Overflow Menu Button (Excluded for Events and Audit Logs where Describe is the single action) */}
          {tab !== 20 && tab !== 24 && (
            <Tooltip title="More Actions">
              <IconButton
                size="small"
                onClick={(e) => handleOpenRowMenu(e, resource, tab)}
                sx={{
                  color: (rowMenuAnchorEl && rowMenuResource === resource) ? 'primary.main' : 'text.secondary',
                  '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    );
  };

  if (clustersLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={36} sx={{ color: '#38bdf8' }} />
      </Box>
    );
  }

  if (availableClusters.length === 0) {
    return <NoClusterView />;
  }

  if (metricsError && !clusterMeta) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to fetch cluster configuration: {(metricsError as Error).message}
        </Alert>
      </Box>
    );
  }

  const name = clusterMeta?.name || dashboardInfo?.name || id;
  const status = clusterMeta?.status || dashboardInfo?.status || 'Healthy';
  const type = clusterMeta?.type || (dashboardInfo as any)?.type || 'workload';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Edge-to-Edge Top Console Header Bar */}
      <Box
        sx={{
          py: 1.25,
          px: 3,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.9,
              px: 1.4,
              py: 0.6,
              borderRadius: 2,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: status === 'Healthy' ? '#10b981' : '#f59e0b',
                boxShadow: status === 'Healthy' ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 750, color: 'text.primary', fontSize: '0.85rem' }}>
              {clusterMeta?.name || 'Kubernetes Cluster'}
            </Typography>
            <Chip
              label={status}
              size="small"
              color={status === 'Healthy' ? 'success' : 'warning'}
              sx={{ fontWeight: 700, height: 18, fontSize: '0.62rem', borderRadius: 1 }}
            />
            <Tooltip title="Disconnect this Kubernetes cluster from NextKube">
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LinkOffIcon sx={{ fontSize: '0.9rem !important' }} />}
                onClick={handleDisconnectCluster}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  height: 22,
                  py: 0,
                  px: 0.8,
                  borderRadius: 1,
                  textTransform: 'none',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  '&:hover': { borderColor: 'error.main', bgcolor: 'rgba(239, 68, 68, 0.08)' },
                }}
              >
                Disconnect
              </Button>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
          {/* Namespace Dropdown Selector */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="namespace-select-label">Namespace</InputLabel>
            <Select
              labelId="namespace-select-label"
              value={selectedNamespace}
              label="Namespace"
              onChange={(e) => handleNamespaceChange(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">
                <em>All Namespaces</em>
              </MenuItem>
              {(namespaces || []).map((ns) => (
                <MenuItem key={ns} value={ns}>
                  {ns}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Refresh resources">
            <IconButton onClick={handleRefreshAll} color="primary" size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 0.8 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Native Edge-to-Edge Console Container */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {/* Left Vertical Navigation Sidebar - Docked Edge to Edge */}
        <Box
          sx={{
            width: 240,
            minWidth: 240,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            py: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <Tabs
            orientation="vertical"
            variant="scrollable"
            scrollButtons="auto"
            value={activeTab}
            onChange={(e, val) => { setActiveTab(val); setSearchQuery(''); setPage(0); }}
            sx={{
              flexGrow: 1,
              height: '100%',
              '& .MuiTabs-scroller': {
                overflowY: 'auto !important',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(148, 163, 184, 0.4) transparent',
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(148, 163, 184, 0.35)',
                  borderRadius: '6px',
                  border: '1px solid transparent',
                  backgroundClip: 'content-box',
                  transition: 'background-color 0.2s ease',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  backgroundColor: 'rgba(148, 163, 184, 0.65)',
                },
              },
              '& .MuiTab-root': {
                alignItems: 'flex-start',
                textAlign: 'left',
                fontWeight: 650,
                fontSize: '0.82rem',
                py: 1,
                px: 2.5,
                minHeight: 'auto',
                borderRadius: 1.5,
                mx: 1,
                my: 0.2,
                transition: 'all 0.15s ease',
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  fontWeight: 750,
                }
              }
            }}
          >
            <Tab label="Overview" />
            <Tab label="Pods" />
            <Tab label="Deployments" />
            <Tab label="DaemonSets" />
            <Tab label="StatefulSets" />
            <Tab label="ReplicaSets" />
            <Tab label="Jobs" />
            <Tab label="CronJobs" />
            <Tab label="Services" />
            <Tab label="Ingresses" />
            <Tab label="NetworkPolicies" />
            <Tab label="ConfigMaps" />
            <Tab label="Secrets" />
            <Tab label="PersistentVolumeClaims" />
            <Tab label="StorageClasses" />
            <Tab label="Nodes" />
            <Tab label="ServiceAccounts" />
            <Tab label="Roles" />
            <Tab label="RoleBindings" />
            <Tab label="Custom Resource Definitions" />
            <Tab label="Events" />
            <Tab label="HorizontalPodAutoscalers" />
            <Tab label="PersistentVolumes" />
            <Tab label="Gateway API" />
            <Tab label="Audit Trail" />
            <Tab label="Helm Releases" />
          </Tabs>
        </Box>

        {/* Right Main Resource Content Panel */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 3 }}>
          {/* Phase 5: Cluster Health & Anomaly Alert Banner */}
          {healthData && healthData.anomalies.length > 0 && !healthBannerDismissed && (
            <Paper
              variant="outlined"
              sx={{
                mb: 2.5,
                p: 2,
                borderRadius: 2,
                bgcolor: healthData.status === 'critical' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                borderColor: healthData.status === 'critical' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                borderLeft: `4px solid ${healthData.status === 'critical' ? '#ef4444' : '#f59e0b'}`,
                flexShrink: 0,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ReportProblemIcon sx={{ color: healthData.status === 'critical' ? '#ef4444' : '#f59e0b', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: healthData.status === 'critical' ? '#ef4444' : '#f59e0b' }}>
                    Cluster Health Anomalies ({healthData.anomalies.length})
                  </Typography>
                  <Chip
                    label={`Health Score: ${healthData.score}%`}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.68rem',
                      height: 20,
                      bgcolor: healthData.score > 80 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: healthData.score > 80 ? '#22c55e' : '#ef4444',
                    }}
                  />
                  {healthData.counts.critical > 0 && (
                    <Chip label={`${healthData.counts.critical} Critical`} size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                  )}
                  {healthData.counts.warning > 0 && (
                    <Chip label={`${healthData.counts.warning} Warning`} size="small" color="warning" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                  )}
                </Box>
                <IconButton size="small" onClick={() => setHealthBannerDismissed(true)} sx={{ color: 'text.secondary', p: 0.5 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
                {healthData.anomalies.slice(0, 3).map((anomaly) => (
                  <Box
                    key={anomaly.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor: 'action.hover',
                      px: 1.5,
                      py: 0.8,
                      borderRadius: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, mr: 1 }}>
                      <Chip
                        label={anomaly.severity.toUpperCase()}
                        size="small"
                        color={anomaly.severity === 'critical' ? 'error' : 'warning'}
                        sx={{ fontSize: '0.6rem', fontWeight: 800, height: 18 }}
                      />
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {anomaly.type.toUpperCase()}: <span style={{ color: '#38bdf8' }}>{anomaly.name}</span>
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        — {anomaly.message}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        if (anomaly.type === 'pod') {
                          setActiveTab(1);
                          setSearchQuery(anomaly.name);
                        } else if (anomaly.type === 'deployment') {
                          setActiveTab(2);
                          setSearchQuery(anomaly.name);
                        } else if (anomaly.type === 'node') {
                          setActiveTab(15);
                          setSearchQuery(anomaly.name);
                        } else {
                          setActiveTab(20);
                          setSearchQuery(anomaly.name);
                        }
                      }}
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        py: 0.3,
                        px: 1,
                        height: 24,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      Troubleshoot
                    </Button>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
          {activeTab !== 0 && (
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <TextField
                placeholder="Search resources by name..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: 350 }}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />,
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Showing {getActiveTabFilteredResources().length} resources
              </Typography>
            </Box>
          )}

          {selectedResources.length > 0 && (
            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                mb: 2,
                bgcolor: 'error.light',
                color: 'error.contrastText',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: 2,
                flexShrink: 0,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {selectedResources.length} resources selected for bulk actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={handleOpenBulkDelete}
                  sx={{ fontWeight: 700, bgcolor: 'error.main' }}
                >
                  Delete
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={() => setSelectedResources([])}
                  sx={{ fontWeight: 700, borderColor: 'currentColor' }}
                >
                  Cancel Selection
                </Button>
              </Box>
            </Paper>
          )}

          {isDataLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2, flexGrow: 1 }}>
              <CircularProgress size={36} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Connecting to API cluster resources...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1, overflowY: 'auto', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              {/* TAB 0: OVERVIEW */}
              {activeTab === 0 && (
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                    Cluster Health & Workloads Overview
                  </Typography>

                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>PODS RUNNING</Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, my: 1, color: 'success.main' }}>
                            {(pods || []).filter(p => p && p.status === 'Running').length} / {(pods || []).length}
                          </Typography>
                          <LinearProgress variant="determinate" value={(pods || []).length > 0 ? ((pods || []).filter(p => p && p.status === 'Running').length / (pods || []).length) * 100 : 100} color="success" sx={{ height: 6, borderRadius: 1 }} />
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>DEPLOYMENTS HEALTHY</Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, my: 1, color: 'info.main' }}>
                            {(deployments || []).filter(d => d && d.readyReplicas === d.replicas).length} / {(deployments || []).length}
                          </Typography>
                          <LinearProgress variant="determinate" value={(deployments || []).length > 0 ? ((deployments || []).filter(d => d && d.readyReplicas === d.replicas).length / (deployments || []).length) * 100 : 100} color="info" sx={{ height: 6, borderRadius: 1 }} />
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>NODES READY</Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, my: 1, color: 'primary.main' }}>
                            {(nodes || []).filter(n => n && n.status === 'Ready').length} / {(nodes || []).length}
                          </Typography>
                          <LinearProgress variant="determinate" value={(nodes || []).length > 0 ? ((nodes || []).filter(n => n && n.status === 'Ready').length / (nodes || []).length) * 100 : 100} color="primary" sx={{ height: 6, borderRadius: 1 }} />
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TOTAL NAMESPACES</Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, my: 1, color: 'secondary.main' }}>
                            {namespaces.length}
                          </Typography>
                          <LinearProgress variant="determinate" value={100} color="secondary" sx={{ height: 6, borderRadius: 1 }} />
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* TAB 1: PODS */}
              {activeTab === 1 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedResources.length > 0 && selectedResources.length < filteredPods.length}
                          checked={filteredPods.length > 0 && selectedResources.length === filteredPods.length}
                          onChange={(e) => handleSelectAllRows(e.target.checked, filteredPods)}
                        />
                      </TableCell>
                      <TableCell>Pod Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Containers</TableCell>
                      <TableCell>Ready</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>CPU / Mem</TableCell>
                      <TableCell>Restarts</TableCell>
                      <TableCell>Node</TableCell>
                      <TableCell>IP</TableCell>
                      <TableCell>Image</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredPods).map((pod) => (
                      <TableRow key={pod.name} hover>
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={isRowSelected(pod)} onChange={() => handleToggleRowSelect(pod)} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{pod.name}</TableCell>
                        <TableCell><Chip label={pod.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell>
                          <Chip
                            label={`${pod.containers?.length || 1} ctr`}
                            size="small"
                            variant="outlined"
                            color="info"
                            sx={{ fontSize: '0.65rem', borderRadius: 1, height: 20 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 650, color: 'text.secondary', fontSize: '0.8rem' }}>{pod.ready || '1/1'}</TableCell>
                        <TableCell>
                          <Chip label={pod.status} size="small" color={pod.status === 'Running' ? 'success' : pod.status === 'Pending' ? 'warning' : 'error'} sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1 }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {pod.cpuUsage || pod.memoryUsage ? (
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              {pod.cpuUsage && (
                                <Chip label={`CPU: ${pod.cpuUsage}`} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                              )}
                              {pod.memoryUsage && (
                                <Chip label={`Mem: ${pod.memoryUsage}`} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ color: pod.restarts > 0 ? 'warning.main' : 'inherit', fontWeight: pod.restarts > 0 ? 700 : 'inherit' }}>
                          {pod.restarts}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary' }}>
                          {pod.node || '-'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary' }}>
                          {pod.ip || '-'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pod.image ? (
                            <Tooltip title={pod.image}>
                              <span>{pod.image}</span>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{pod.age}</TableCell>
                        {renderRowActionCell(pod, 1)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 2: DEPLOYMENTS */}
              {activeTab === 2 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedResources.length > 0 && selectedResources.length < filteredDeployments.length}
                          checked={filteredDeployments.length > 0 && selectedResources.length === filteredDeployments.length}
                          onChange={(e) => handleSelectAllRows(e.target.checked, filteredDeployments)}
                        />
                      </TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Ready Replicas</TableCell>
                      <TableCell>Total Replicas</TableCell>
                      <TableCell>Up-to-Date</TableCell>
                      <TableCell>Available</TableCell>
                      <TableCell>Image</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredDeployments).map((dep) => (
                      <TableRow key={dep.name} hover>
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={isRowSelected(dep)} onChange={() => handleToggleRowSelect(dep)} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{dep.name}</TableCell>
                        <TableCell><Chip label={dep.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell sx={{ fontWeight: 700, color: dep.readyReplicas === dep.replicas ? 'success.main' : 'warning.main' }}>
                          {dep.readyReplicas} / {dep.replicas}
                        </TableCell>
                        <TableCell>{dep.replicas}</TableCell>
                        <TableCell>{dep.updatedReplicas}</TableCell>
                        <TableCell>{dep.availableReplicas}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dep.image ? (
                            <Tooltip title={dep.image}>
                              <span>{dep.image}</span>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{dep.age}</TableCell>
                        {renderRowActionCell(dep, 2)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 3: DAEMONSETS */}
              {activeTab === 3 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Desired</TableCell>
                      <TableCell>Current</TableCell>
                      <TableCell>Ready</TableCell>
                      <TableCell>Up-to-date</TableCell>
                      <TableCell>Available</TableCell>
                      <TableCell>Image</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredDaemonSets).map((ds) => (
                      <TableRow key={`${ds.namespace}-${ds.name}`} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{ds.name}</TableCell>
                        <TableCell><Chip label={ds.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell>{ds.desiredNumberScheduled}</TableCell>
                        <TableCell>{ds.currentNumberScheduled}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: ds.numberReady === ds.desiredNumberScheduled ? 'success.main' : 'warning.main' }}>{ds.numberReady}</TableCell>
                        <TableCell>{ds.updatedNumberScheduled}</TableCell>
                        <TableCell>{ds.numberAvailable}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ds.image ? (
                            <Tooltip title={ds.image}>
                              <span>{ds.image}</span>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{ds.age}</TableCell>
                        {renderRowActionCell(ds, 3)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 4: STATEFULSETS */}
              {activeTab === 4 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Ready Replicas</TableCell>
                      <TableCell>Total Replicas</TableCell>
                      <TableCell>Image</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredStatefulSets).map((sts) => (
                      <TableRow key={sts.name} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{sts.name}</TableCell>
                        <TableCell><Chip label={sts.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell sx={{ fontWeight: 700, color: sts.readyReplicas === sts.replicas ? 'success.main' : 'warning.main' }}>{sts.readyReplicas} / {sts.replicas}</TableCell>
                        <TableCell>{sts.replicas}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sts.image ? (
                            <Tooltip title={sts.image}>
                              <span>{sts.image}</span>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{sts.age}</TableCell>
                        {renderRowActionCell(sts, 4)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 5: REPLICASETS */}
              {activeTab === 5 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Desired</TableCell>
                      <TableCell>Current</TableCell>
                      <TableCell>Ready</TableCell>
                      <TableCell>Image</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredReplicaSets).map((rs) => (
                      <TableRow key={rs.name} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{rs.name}</TableCell>
                        <TableCell><Chip label={rs.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell>{rs.desiredReplicas}</TableCell>
                        <TableCell>{rs.currentReplicas}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: rs.readyReplicas === rs.desiredReplicas ? 'success.main' : 'warning.main' }}>{rs.readyReplicas}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rs.image ? (
                            <Tooltip title={rs.image}>
                              <span>{rs.image}</span>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{rs.age}</TableCell>
                        {renderRowActionCell(rs, 5)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 6: JOBS */}
              {activeTab === 6 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Job Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Completions</TableCell>
                      <TableCell>Succeeded</TableCell>
                      <TableCell>Failed</TableCell>
                      <TableCell>Image</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredJobs).map((j) => (
                      <TableRow key={j.name} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{j.name}</TableCell>
                        <TableCell><Chip label={j.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell>{j.completions}</TableCell>
                        <TableCell sx={{ color: 'success.main', fontWeight: 700 }}>{j.succeeded ?? j.completions}</TableCell>
                        <TableCell sx={{ color: (j.failed ?? 0) > 0 ? 'error.main' : 'text.primary' }}>{j.failed ?? 0}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {j.image ? (
                            <Tooltip title={j.image}>
                              <span>{j.image}</span>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{j.age}</TableCell>
                        {renderRowActionCell(j, 6)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 7: CRONJOBS */}
              {activeTab === 7 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Schedule</TableCell>
                      <TableCell>Suspend</TableCell>
                      <TableCell>Active Jobs</TableCell>
                      <TableCell>Last Schedule</TableCell>
                      <TableCell>Image</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredCronJobs).map((cj) => (
                      <TableRow key={cj.name} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{cj.name}</TableCell>
                        <TableCell><Chip label={cj.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{cj.schedule}</TableCell>
                        <TableCell>{cj.suspend ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{cj.activeJobs ?? cj.active}</TableCell>
                        <TableCell>{cj.lastSchedule}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cj.image ? (
                            <Tooltip title={cj.image}>
                              <span>{cj.image}</span>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{cj.age}</TableCell>
                        {renderRowActionCell(cj, 7)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 8: SERVICES */}
              {activeTab === 8 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Cluster IP</TableCell>
                      <TableCell>External IP</TableCell>
                      <TableCell>Ports</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredServices).map((svc) => (
                      <TableRow key={svc.name} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{svc.name}</TableCell>
                        <TableCell><Chip label={svc.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell><Chip label={svc.type} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{svc.clusterIp ?? svc.clusterIP}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{svc.externalIp ?? svc.externalIP}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{svc.ports}</TableCell>
                        <TableCell>{svc.age}</TableCell>
                        {renderRowActionCell(svc, 8)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 9: INGRESSES */}
              {activeTab === 9 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Hosts</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredIngresses).map((ing) => (
                      <TableRow key={`${ing.namespace}-${ing.name}`} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{ing.name}</TableCell>
                        <TableCell><Chip label={ing.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell>{ing.ingressClass}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{ing.hosts}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{ing.address}</TableCell>
                        <TableCell>{ing.age}</TableCell>
                        {renderRowActionCell(ing, 9)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 10: NETWORKPOLICIES */}
              {activeTab === 10 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Policy Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Policy Types</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredNetworkPolicies).map((np) => (
                      <TableRow key={`${np.namespace}-${np.name}`} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{np.name}</TableCell>
                        <TableCell><Chip label={np.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{np.policyTypes}</TableCell>
                        <TableCell>{np.age}</TableCell>
                        {renderRowActionCell(np, 10)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 11: CONFIGMAPS */}
              {activeTab === 11 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Data Items</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredConfigMaps).map((cm) => (
                      <TableRow key={`${cm.namespace}-${cm.name}`} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{cm.name}</TableCell>
                        <TableCell><Chip label={cm.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell>{cm.keysCount ?? cm.dataCount} keys</TableCell>
                        <TableCell>{cm.age}</TableCell>
                        {renderRowActionCell(cm, 11)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 12: SECRETS */}
              {activeTab === 12 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Data Keys</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredSecrets).map((sec) => (
                      <TableRow key={`${sec.namespace}-${sec.name}`} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{sec.name}</TableCell>
                        <TableCell><Chip label={sec.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{sec.type}</TableCell>
                        <TableCell>{sec.keysCount ?? sec.dataCount} keys</TableCell>
                        <TableCell>{sec.age}</TableCell>
                        {renderRowActionCell(sec, 12)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 13: PVCS */}
              {activeTab === 13 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Volume</TableCell>
                      <TableCell>Capacity</TableCell>
                      <TableCell>StorageClass</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredPVCs).map((pvc) => (
                      <TableRow key={`${pvc.namespace}-${pvc.name}`} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{pvc.name}</TableCell>
                        <TableCell><Chip label={pvc.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell><Chip label={pvc.status} size="small" color={pvc.status === 'Bound' ? 'success' : 'warning'} sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{pvc.volume}</TableCell>
                        <TableCell>{pvc.capacity}</TableCell>
                        <TableCell>{pvc.storageClass}</TableCell>
                        <TableCell>{pvc.age}</TableCell>
                        {renderRowActionCell(pvc, 13)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 14: STORAGECLASSES */}
              {activeTab === 14 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>StorageClass Name</TableCell>
                      <TableCell>Provisioner</TableCell>
                      <TableCell>Reclaim Policy</TableCell>
                      <TableCell>Binding Mode</TableCell>
                      <TableCell>Default</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredStorageClasses).map((sc) => (
                      <TableRow key={sc.name} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{sc.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{sc.provisioner}</TableCell>
                        <TableCell>{sc.reclaimPolicy}</TableCell>
                        <TableCell>{sc.volumeBindingMode}</TableCell>
                        <TableCell>{sc.isDefault ? <Chip label="Yes (Default)" color="primary" size="small" sx={{ fontSize: '0.65rem' }} /> : 'No'}</TableCell>
                        <TableCell>{sc.age}</TableCell>
                        {renderRowActionCell(sc, 14)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 15: NODES */}
              {activeTab === 15 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Node Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Roles</TableCell>
                      <TableCell>Capacity (CPU/Mem)</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell>Conditions</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredNodes).map((node) => (
                      <TableRow key={node.name} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{node.name}</TableCell>
                        <TableCell>
                          <Chip label={node.status} size="small" color={node.status === 'Ready' ? 'success' : 'error'} sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1 }} />
                        </TableCell>
                        <TableCell><Chip label={node.roles ?? node.role} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {node.cpuCapacity ? (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Chip label={`${node.cpuCapacity} CPU`} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                              <Chip label={node.memoryCapacity || '-'} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                            </Box>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>Int: {node.internalIp} <br /> Ext: {node.externalIp}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{node.version}</TableCell>
                        <TableCell>{node.age}</TableCell>
                        <TableCell>
                          {!node.cpuPressure && !node.memoryPressure && !node.diskPressure && !node.pidPressure ? (
                            <Chip label="Healthy" size="small" color="success" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                          ) : (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {node.memoryPressure && <Chip label="MemPressure" size="small" color="warning" sx={{ fontSize: '0.6rem', height: 18 }} />}
                              {node.diskPressure && <Chip label="DiskPressure" size="small" color="error" sx={{ fontSize: '0.6rem', height: 18 }} />}
                              {node.pidPressure && <Chip label="PIDPressure" size="small" color="error" sx={{ fontSize: '0.6rem', height: 18 }} />}
                            </Box>
                          )}
                        </TableCell>
                        {renderRowActionCell(node, 15)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 16: SERVICEACCOUNTS */}
              {activeTab === 16 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Secrets</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredServiceAccounts).map((sa) => (
                      <TableRow key={`${sa.namespace}-${sa.name}`} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{sa.name}</TableCell>
                        <TableCell><Chip label={sa.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell>{sa.secretsCount}</TableCell>
                        <TableCell>{sa.age}</TableCell>
                        {renderRowActionCell(sa, 16)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 17: ROLES (Roles & ClusterRoles) */}
              {activeTab === 17 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Role Name</TableCell>
                      <TableCell>Scope / Namespace</TableCell>
                      <TableCell>Rules Count</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredRoles).map((r) => (
                      <TableRow key={`${r.namespace}-${r.name}`} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{r.name}</TableCell>
                        <TableCell>{r.isClusterRole ? <Chip label="ClusterRole" color="secondary" size="small" sx={{ fontSize: '0.65rem' }} /> : <Chip label={r.namespace} size="small" sx={{ fontSize: '0.65rem' }} />}</TableCell>
                        <TableCell>{r.rulesCount} rules</TableCell>
                        <TableCell>{r.age}</TableCell>
                        {renderRowActionCell(r, 17)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 18: ROLEBINDINGS (RoleBindings & ClusterRoleBindings) */}
              {activeTab === 18 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Binding Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Role Ref</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredRoleBindings).map((rb) => (
                      <TableRow key={`${rb.namespace}-${rb.name}`} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{rb.name}</TableCell>
                        <TableCell>{rb.isClusterBinding ? <Chip label="ClusterRoleBinding" color="secondary" size="small" sx={{ fontSize: '0.65rem' }} /> : <Chip label={rb.namespace} size="small" sx={{ fontSize: '0.65rem' }} />}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{rb.roleRef || '-'}</TableCell>
                        <TableCell>{rb.age}</TableCell>
                        {renderRowActionCell(rb, 18)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 19: CRDS */}
              {activeTab === 19 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>CRD Name</TableCell>
                      <TableCell>Group</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell>Scope</TableCell>
                      <TableCell>Kind</TableCell>
                      <TableCell>Instances</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredCRDs).map((crd) => (
                      <TableRow key={crd.name} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{crd.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{crd.group}</TableCell>
                        <TableCell>{crd.version}</TableCell>
                        <TableCell><Chip label={crd.scope} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{crd.kind}</TableCell>
                        <TableCell>{crd.instancesCount}</TableCell>
                        <TableCell>{crd.age}</TableCell>
                        {renderRowActionCell(crd, 19)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 20: EVENTS */}
              {activeTab === 20 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Last Seen</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Object</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredEvents).map((evt) => (
                      <TableRow key={evt.id} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{evt.lastSeen}</TableCell>
                        <TableCell>
                          <Chip label={evt.type} size="small" color={evt.type === 'Warning' ? 'warning' : 'info'} sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{evt.reason}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{evt.object}</TableCell>
                        <TableCell><Chip label={evt.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{evt.message}</TableCell>
                        {renderRowActionCell(evt, 20)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 21: HORIZONTAL POD AUTOSCALERS (HPA) */}
              {activeTab === 21 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>HPA Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Target Reference</TableCell>
                      <TableCell>Min / Max Replicas</TableCell>
                      <TableCell>Current / Desired</TableCell>
                      <TableCell>Target Metrics</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredHPAs).map((hpa) => (
                      <TableRow key={hpa.name} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{hpa.name}</TableCell>
                        <TableCell><Chip label={hpa.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{hpa.reference}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{hpa.minReplicas} / {hpa.maxReplicas}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Chip label={`${hpa.currentReplicas} / ${hpa.desiredReplicas}`} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                        </TableCell>
                        <TableCell>
                          <Chip label={hpa.metrics} size="small" sx={{ fontSize: '0.68rem', bgcolor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }} />
                        </TableCell>
                        <TableCell>{hpa.age}</TableCell>
                        {renderRowActionCell(hpa, 21)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 22: PERSISTENT VOLUMES (PV) */}
              {activeTab === 22 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>PV Name</TableCell>
                      <TableCell>Capacity</TableCell>
                      <TableCell>Access Modes</TableCell>
                      <TableCell>Reclaim Policy</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Claim</TableCell>
                      <TableCell>StorageClass</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate(filteredPVs).map((pv) => (
                      <TableRow key={pv.name} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace' }}>{pv.name}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{pv.capacity}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{pv.accessModes}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{pv.reclaimPolicy}</TableCell>
                        <TableCell>
                          <Chip label={pv.status} size="small" color={pv.status === 'Bound' ? 'success' : pv.status === 'Available' ? 'info' : 'warning'} sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1 }} />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{pv.claim}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{pv.storageClass}</TableCell>
                        <TableCell>{pv.age}</TableCell>
                        {renderRowActionCell(pv, 22)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 23: GATEWAY API */}
              {activeTab === 23 && (
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Gateway Class / Hostnames</TableCell>
                      <TableCell>Listeners / ParentRefs</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginate([...filteredGateways, ...filteredHTTPRoutes]).map((gw: any) => (
                      <TableRow key={gw.name} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{gw.name}</TableCell>
                        <TableCell><Chip label={gw.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{gw.className || gw.hostnames || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{gw.listeners || gw.parentRefs || '-'}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{gw.addresses || '-'}</TableCell>
                        <TableCell>
                          <Chip label={gw.status || 'Active'} size="small" color={gw.status === 'Programmed' ? 'success' : 'info'} sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1 }} />
                        </TableCell>
                        <TableCell>{gw.age}</TableCell>
                        {renderRowActionCell(gw, 23)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* TAB 24: AUDIT TRAIL */}
              {activeTab === 24 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HistoryIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        Cluster Operational Audit Log
                      </Typography>
                      <Chip label={`${filteredAuditLogs.length} Records`} size="small" variant="outlined" sx={{ fontSize: '0.68rem', fontWeight: 700 }} />
                    </Box>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <Select
                        value={auditActionFilter}
                        onChange={(e) => setAuditActionFilter(e.target.value)}
                        sx={{ height: 32, fontSize: '0.78rem', borderRadius: 1.5 }}
                      >
                        <MenuItem value="all">All Operations</MenuItem>
                        <MenuItem value="SCALE_REPLICAS">Scale Replicas</MenuItem>
                        <MenuItem value="ROLLOUT_RESTART">Rollout Restart</MenuItem>
                        <MenuItem value="APPLY_MANIFEST">Apply Manifest</MenuItem>
                        <MenuItem value="DELETE_RESOURCE">Delete Resource</MenuItem>
                        <MenuItem value="CUSTOM_OPERATION">Custom Operations</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Table stickyHeader size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Operator</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Resource</TableCell>
                        <TableCell>Namespace</TableCell>
                        <TableCell>Operation Details</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAuditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            No audit records found matching query.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginate(filteredAuditLogs).map((entry) => (
                          <TableRow key={entry.id} hover>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                              {new Date(entry.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={entry.user}
                                size="small"
                                variant="outlined"
                                color="info"
                                sx={{ fontSize: '0.68rem', fontWeight: 700, borderRadius: 1 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={entry.action}
                                size="small"
                                color={
                                  entry.action === 'DELETE_RESOURCE'
                                    ? 'error'
                                    : entry.action === 'SCALE_REPLICAS'
                                      ? 'primary'
                                      : entry.action === 'ROLLOUT_RESTART'
                                        ? 'warning'
                                        : 'info'
                                }
                                sx={{ fontSize: '0.65rem', fontWeight: 800, borderRadius: 1 }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8rem' }}>
                              {entry.resourceType}/{entry.resourceName}
                            </TableCell>
                            <TableCell>
                              <Chip label={entry.namespace || 'default'} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} />
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                              {entry.details || '-'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={entry.status}
                                size="small"
                                color={entry.status === 'SUCCESS' ? 'success' : 'error'}
                                sx={{ fontSize: '0.65rem', fontWeight: 800, height: 20, borderRadius: 1 }}
                              />
                            </TableCell>
                            {renderRowActionCell(entry, 24)}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {/* TAB 25: HELM RELEASES */}
              {activeTab === 25 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StorageIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        Installed Helm Releases (v3)
                      </Typography>
                      <Chip label={`${filteredHelmReleases.length} Releases`} size="small" variant="outlined" sx={{ fontSize: '0.68rem', fontWeight: 700 }} />
                    </Box>
                  </Box>

                  <Table stickyHeader size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell>Release Name</TableCell>
                        <TableCell>Namespace</TableCell>
                        <TableCell>Chart</TableCell>
                        <TableCell>App Version</TableCell>
                        <TableCell>Revision</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Updated</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredHelmReleases.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            No Helm releases found in selected namespace.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginate(filteredHelmReleases).map((release) => (
                          <TableRow key={`${release.namespace}-${release.name}`} hover>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.82rem' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <StorageIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                {release.name}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={release.namespace} size="small" sx={{ fontSize: '0.65rem', borderRadius: 1 }} />
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                              {release.chart}
                              {release.chartVersion ? ` (${release.chartVersion})` : ''}
                            </TableCell>
                            <TableCell>
                              <Chip label={release.appVersion || '-'} size="small" variant="outlined" sx={{ fontSize: '0.65rem', borderRadius: 1 }} />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`rev ${release.revision}`}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  bgcolor: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  borderRadius: 1,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={release.status}
                                size="small"
                                color={
                                  release.status === 'deployed'
                                    ? 'success'
                                    : release.status === 'failed'
                                      ? 'error'
                                      : 'warning'
                                }
                                sx={{ fontSize: '0.65rem', fontWeight: 800, height: 20, borderRadius: 1 }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                              {release.updated || release.age || '-'}
                            </TableCell>
                            {renderRowActionCell(release, 25)}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
              )}

            </Box>
          )}

          {/* MUI TablePagination Footer */}
          {activeTab !== 0 && (
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={getActiveTabFilteredResources().length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
                minHeight: 52,
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontSize: '0.8rem',
                  fontWeight: 600,
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Shared Row Actions Overflow Menu */}
      <Menu
        anchorEl={rowMenuAnchorEl}
        open={Boolean(rowMenuAnchorEl && rowMenuResource)}
        onClose={handleCloseRowMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 4,
            sx: {
              minWidth: 190,
              borderRadius: 2,
              py: 0.5,
              border: '1px solid',
              borderColor: 'divider',
              backdropFilter: 'blur(16px)',
            },
          },
        }}
      >
        {/* Describe Action */}
        {rowMenuTab !== 20 && rowMenuTab !== 24 && (
          <MenuItem
            dense
            onClick={() => {
              const res = rowMenuResource;
              const tab = rowMenuTab;
              handleCloseRowMenu();
              handleOpenDescribe(res, tab);
            }}
          >
            <ListItemIcon>
              <DescriptionOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Describe" secondary="kubectl describe" />
          </MenuItem>
        )}

        {/* View / Edit YAML */}
        {[1, 2, 3, 4, 6, 15].includes(rowMenuTab) && (
          <MenuItem
            dense
            onClick={() => {
              const res = rowMenuResource;
              handleCloseRowMenu();
              handleOpenYaml(res);
            }}
          >
            <ListItemIcon>
              <CodeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="View / Edit YAML" />
          </MenuItem>
        )}

        {/* Pod Specific: Restart Pod */}
        {rowMenuTab === 1 && (
          <MenuItem
            dense
            onClick={() => {
              const res = rowMenuResource;
              handleCloseRowMenu();
              handleOpenRestart(res);
            }}
          >
            <ListItemIcon>
              <RestartAltIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText primary="Restart Pod" />
          </MenuItem>
        )}

        {/* Deployment Specific: Terminal Exec, Set Image, Rollout */}
        {rowMenuTab === 2 && (
          <>
            <MenuItem
              dense
              onClick={() => {
                const res = rowMenuResource;
                handleCloseRowMenu();
                handleOpenExec(res);
              }}
            >
              <ListItemIcon>
                <TerminalIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Terminal Exec" />
            </MenuItem>
            <MenuItem
              dense
              onClick={() => {
                const res = rowMenuResource;
                handleCloseRowMenu();
                handleOpenImageDialog(res);
              }}
            >
              <ListItemIcon>
                <ImageOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Set Container Image" />
            </MenuItem>
            <MenuItem
              dense
              onClick={() => {
                const res = rowMenuResource;
                handleCloseRowMenu();
                handleOpenRollout(res);
              }}
            >
              <ListItemIcon>
                <SwapVertIcon fontSize="small" color="warning" />
              </ListItemIcon>
              <ListItemText primary="Rollout & Rollback" />
            </MenuItem>
          </>
        )}

        {/* DaemonSet Specific: Set Image, Rollout Restart */}
        {rowMenuTab === 3 && (
          <>
            <MenuItem
              dense
              onClick={() => {
                const res = rowMenuResource;
                handleCloseRowMenu();
                handleOpenImageDialog(res);
              }}
            >
              <ListItemIcon>
                <ImageOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Set Container Image" />
            </MenuItem>
            <MenuItem
              dense
              onClick={() => {
                const res = rowMenuResource;
                handleCloseRowMenu();
                handleOpenRollout(res);
              }}
            >
              <ListItemIcon>
                <SwapVertIcon fontSize="small" color="warning" />
              </ListItemIcon>
              <ListItemText primary="Rollout Restart" />
            </MenuItem>
          </>
        )}

        {/* StatefulSet Specific: Terminal Exec, Rollout Restart */}
        {rowMenuTab === 4 && (
          <>
            <MenuItem
              dense
              onClick={() => {
                const res = rowMenuResource;
                handleCloseRowMenu();
                handleOpenExec(res);
              }}
            >
              <ListItemIcon>
                <TerminalIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Terminal Exec" />
            </MenuItem>
            <MenuItem
              dense
              onClick={() => {
                const res = rowMenuResource;
                handleCloseRowMenu();
                handleOpenRollout(res);
              }}
            >
              <ListItemIcon>
                <SwapVertIcon fontSize="small" color="warning" />
              </ListItemIcon>
              <ListItemText primary="Rollout Restart" />
            </MenuItem>
          </>
        )}

        {/* CronJob Specific: Terminal Exec */}
        {rowMenuTab === 7 && (
          <MenuItem
            dense
            onClick={() => {
              const res = rowMenuResource;
              handleCloseRowMenu();
              handleOpenExec(res);
            }}
          >
            <ListItemIcon>
              <TerminalIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Terminal Exec" />
          </MenuItem>
        )}

        {/* Helm Release Specific: Rollback Revision, Uninstall */}
        {rowMenuTab === 25 && (
          <>
            <MenuItem
              dense
              onClick={() => {
                const res = rowMenuResource;
                handleCloseRowMenu();
                handleOpenHelmRollback(res);
              }}
            >
              <ListItemIcon>
                <HistoryIcon fontSize="small" color="warning" />
              </ListItemIcon>
              <ListItemText primary="Rollback Revision" />
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              dense
              onClick={() => {
                const res = rowMenuResource;
                handleCloseRowMenu();
                handleOpenHelmUninstall(res);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <ClearIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText primary="Uninstall Release" />
            </MenuItem>
          </>
        )}

        {/* Standard Delete Resource (Tabs 1-14, 16-18, 21-23) */}
        {rowMenuTab !== 15 && rowMenuTab !== 19 && rowMenuTab !== 20 && rowMenuTab !== 24 && rowMenuTab !== 25 && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              dense
              onClick={() => {
                const res = rowMenuResource;
                handleCloseRowMenu();
                handleOpenDelete(res);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText primary="Delete" />
            </MenuItem>
          </>
        )}
      </Menu>

      {/* kubectl describe Modal Dialog */}
      <Dialog
        open={describeDialogOpen}
        onClose={() => setDescribeDialogOpen(false)}
        PaperComponent={DraggablePaper}
        maxWidth="md"
        fullWidth
        hideBackdrop={true}
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(3px)',
            },
          },
        }}
      >
        <DialogTitle
          id="draggable-dialog-title"
          sx={{
            cursor: 'move',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionOutlinedIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Describe: {describeResource?.object || describeResource?.name}
            </Typography>
            <Chip
              label={describeResource?.kind || getResourceType(describeResource, describeTab).slice(0, -1)}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={describeCopied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
              onClick={() => {
                const desc = formatKubectlDescribe(describeResource, describeTab);
                navigator.clipboard.writeText(desc);
                setDescribeCopied(true);
                setTimeout(() => setDescribeCopied(false), 2000);
                setToastSeverity('success');
                setToastMessage('Describe output copied to clipboard.');
              }}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0.25 }}
            >
              {describeCopied ? 'Copied' : 'Copy Output'}
            </Button>
            <IconButton size="small" onClick={() => setDescribeDialogOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              fontFamily: 'Consolas, Monaco, "Liberation Mono", monospace',
              fontSize: '0.78rem',
              lineHeight: 1.55,
              color: 'text.primary',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0d1117' : '#f6f8fa',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              minHeight: 350,
              maxHeight: 520,
              overflowX: 'auto',
              overflowY: 'auto',
              whiteSpace: 'pre',
              wordBreak: 'normal',
              '&::-webkit-scrollbar': { width: 6, height: 6 },
              '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0,0,0,0.05)' },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 3 },
              '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(0,0,0,0.35)' },
            }}
          >
            {formatKubectlDescribe(describeResource, describeTab)}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setDescribeDialogOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Apply / Create Resource Manifest Modal */}
      <Dialog
        open={createDialogOpen}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          if (!createLoading) setCreateDialogOpen(false);
        }}
        PaperComponent={DraggablePaper}
        maxWidth="md"
        fullWidth
        hideBackdrop={true}
        disableEnforceFocus={true}
        sx={{
          zIndex: topWindow === 'yamlCreate' ? 1330 : 1315,
          pointerEvents: 'none',
          '& .MuiDialog-container': {
            pointerEvents: 'none',
          },
          '& .MuiPaper-root': {
            pointerEvents: 'auto',
          },
        }}
        slotProps={{
          paper: {
            onClick: () => setTopWindow('yamlCreate'),
            onMouseDown: () => setTopWindow('yamlCreate'),
            sx: {
              bgcolor: isDark ? '#0a0e17' : '#ffffff',
              backgroundImage: 'none',
              borderRadius: 3,
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: isDark
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                : '0 25px 50px -12px rgba(15, 23, 42, 0.16)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: isDark ? '#0f1422' : '#f8fafc',
            color: isDark ? '#f0f6fc' : '#0f172a',
            py: 2,
            px: 3,
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AddIcon sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 22 }} />
            <Typography variant="h6" sx={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>
              Apply / Create Resource Manifest
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setCreateDialogOpen(false)}
            sx={{
              color: isDark ? '#94a3b8' : '#64748b',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
              borderRadius: 1.5,
              '&:hover': {
                bgcolor: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#f87171',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: isDark ? '#0a0e17' : '#ffffff', display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 450 }}>
          <Box sx={{ p: 2, bgcolor: isDark ? '#0f1422' : '#f8fafc', borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0' }}>
            <Typography variant="body2" sx={{ color: isDark ? '#8b949e' : '#64748b' }}>
              Paste or edit a Kubernetes YAML/JSON manifest to apply directly to cluster namespace <b style={{ color: isDark ? '#e6edf3' : '#0f172a' }}>{selectedNamespace === 'all' ? 'default' : selectedNamespace}</b>.
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, height: 420, minHeight: 420, display: 'flex', flexDirection: 'column' }}>
            <YamlIdeEditor
              value={createYamlVal}
              onChange={(val) => setCreateYamlVal(val)}
              height="100%"
              embedded
              hideHeader
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: isDark ? '#0f1422' : '#f8fafc', borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0' }}>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={createLoading} sx={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>
            Cancel
          </Button>
          <Button onClick={handleApplyCreateResource} color="primary" variant="contained" disabled={createLoading} sx={{ fontWeight: 700 }}>
            {createLoading ? <CircularProgress size={20} color="inherit" /> : 'Apply Manifest'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Connect / Add Cluster Dialog */}
      <AddClusterDialog
        open={addClusterOpen}
        onClose={() => setAddClusterOpen(false)}
        onClusterAdded={(newClusterId) => {
          setToastSeverity('success');
          setToastMessage(`Cluster successfully attached and ready.`);
          router.push(`/clusters/${newClusterId}`);
        }}
      />

      {/* YAML IDE Editor Dialog */}
      <YamlEditorDialog
        open={yamlDialogOpen}
        onClose={() => setYamlDialogOpen(false)}
        title={`Edit Manifest: ${selectedResource?.name || ''}`}
        value={yamlContent}
        onChange={(v) => setYamlContent(v)}
        onSave={handleSaveYaml}
        loading={yamlLoading}
        filename={selectedResource?.name || 'manifest'}
        saveButtonText="Save Manifest"
        showSecretToggle={activeTab === 12 || selectedResource?.kind === 'Secret' || (selectedResource && 'dataCount' in selectedResource)}
        secretDecoded={secretDecoded}
        onToggleSecretDecode={handleToggleSecretDecode}
        zIndex={topWindow === 'yamlEditor' ? 1330 : 1315}
        onFocus={() => setTopWindow('yamlEditor')}
      />

      {/* Logs Dialog */}
      <Dialog
        open={logsDialogOpen}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          setLogsDialogOpen(false);
        }}
        PaperComponent={DraggablePaper}
        maxWidth={logsDialogMaximized ? false : "md"}
        fullWidth
        fullScreen={logsDialogMaximized}
        hideBackdrop={true}
        disableEnforceFocus={true}
        sx={{
          zIndex: topWindow === 'logs' ? 1330 : 1315,
          pointerEvents: 'none',
          '& .MuiDialog-container': {
            pointerEvents: 'none',
          },
          '& .MuiPaper-root': {
            pointerEvents: 'auto',
          },
        }}
        slotProps={{
          paper: {
            onClick: () => setTopWindow('logs'),
            onMouseDown: () => setTopWindow('logs'),
            sx: {
              bgcolor: isDark ? '#0a0e17' : '#ffffff',
              backgroundImage: 'none',
              borderRadius: logsDialogMaximized ? 0 : 3,
              border: logsDialogMaximized ? 'none' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: isDark
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                : '0 25px 50px -12px rgba(15, 23, 42, 0.16)',
            },
          },
        }}
      >
        {/* Minimalist, Clean Header Bar */}
        <DialogTitle
          sx={{
            bgcolor: isDark ? '#0f1422' : '#f8fafc',
            color: isDark ? '#f0f6fc' : '#0f172a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 1.75,
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          {/* Left: Clean Title without resource name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ReceiptLongIcon sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 22 }} />
            <Typography variant="h6" sx={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>
              {logsResourceType === 'deployment' ? 'Deployment Logs' : 'Pod Logs'}
            </Typography>
          </Box>

          {/* Center: Controls Stack in Uniform Height */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Container Selector if Pod has multiple containers or container list */}
            {selectedResource?.containers && selectedResource.containers.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={selectedContainer || selectedResource.containers[0] || ''}
                  onChange={(e) => {
                    const newCont = e.target.value;
                    setSelectedContainer(newCont);
                    handleRefreshLogs(logsTimeFrame, newCont);
                  }}
                  MenuProps={{
                    slotProps: {
                      paper: {
                        sx: {
                          bgcolor: isDark ? '#0f1422' : '#ffffff',
                          color: isDark ? '#f0f6fc' : '#0f172a',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                          borderRadius: 1.5,
                          boxShadow: isDark ? '0 20px 40px -10px rgba(0, 0, 0, 0.85)' : '0 20px 40px -10px rgba(15, 23, 42, 0.15)',
                          backgroundImage: 'none',
                          mt: 0.5,
                          '& .MuiMenuItem-root': {
                            fontSize: '0.8rem',
                            color: isDark ? '#cbd5e1' : '#334155',
                            borderRadius: 1,
                            py: 0.6,
                            px: 1.25,
                            my: 0.2,
                            '&:hover': {
                              bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                              color: isDark ? '#f8fafc' : '#0f172a',
                            },
                            '&.Mui-selected': {
                              bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                              color: isDark ? '#38bdf8' : '#0284c7',
                              fontWeight: 700,
                            },
                          },
                        },
                      },
                    },
                  }}
                  sx={{
                    height: 30,
                    bgcolor: isDark ? '#0a0e17' : '#ffffff',
                    color: isDark ? '#38bdf8' : '#0284c7',
                    fontSize: '0.75rem',
                    borderRadius: 1.5,
                    fontWeight: 700,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#bae6fd',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? '#38bdf8' : '#0284c7',
                    },
                    '& .MuiSvgIcon-root': { color: isDark ? '#38bdf8' : '#0284c7', fontSize: 18 },
                  }}
                >
                  {selectedResource.containers.map((cName: string) => (
                    <MenuItem key={cName} value={cName} sx={{ fontSize: '0.8rem' }}>
                      {cName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Time Frame & Pre Selector */}
            <FormControl size="small" sx={{ minWidth: 95 }}>
              <Select
                value={logsTimeFrame}
                onChange={(e) => {
                  const newTf = e.target.value;
                  setLogsTimeFrame(newTf);
                  setLogsPrevious(newTf === 'pre');
                  handleRefreshLogs(newTf);
                }}
                MenuProps={{
                  slotProps: {
                    paper: {
                      sx: {
                        bgcolor: isDark ? '#0f1422' : '#ffffff',
                        color: isDark ? '#f0f6fc' : '#0f172a',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                        borderRadius: 1.5,
                        boxShadow: isDark
                          ? '0 20px 40px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)'
                          : '0 20px 40px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                        backgroundImage: 'none',
                        mt: 0.5,
                        '& .MuiList-root': {
                          p: 0.5,
                        },
                        '& .MuiMenuItem-root': {
                          fontSize: '0.8rem',
                          color: isDark ? '#cbd5e1' : '#334155',
                          borderRadius: 1,
                          py: 0.6,
                          px: 1.25,
                          my: 0.2,
                          '&:hover': {
                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                            color: isDark ? '#f8fafc' : '#0f172a',
                          },
                          '&.Mui-selected': {
                            bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                            color: isDark ? '#38bdf8' : '#0284c7',
                            fontWeight: 700,
                            '&:hover': {
                              bgcolor: isDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(2, 132, 199, 0.16)',
                            },
                          },
                        },
                        '& .MuiDivider-root': {
                          my: 0.5,
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                        },
                      },
                    },
                  },
                }}
                sx={{
                  height: 30,
                  bgcolor: isDark ? '#0a0e17' : '#ffffff',
                  color: logsTimeFrame === 'pre' ? '#f59e0b' : isDark ? '#f0f6fc' : '#0f172a',
                  fontSize: '0.75rem',
                  borderRadius: 1.5,
                  fontWeight: 700,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: logsTimeFrame === 'pre' ? 'rgba(245,158,11,0.5)' : isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: logsTimeFrame === 'pre' ? '#f59e0b' : isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8',
                  },
                  '& .MuiSvgIcon-root': { color: logsTimeFrame === 'pre' ? '#f59e0b' : isDark ? '#94a3b8' : '#64748b', fontSize: 18 },
                }}
              >
                <MenuItem value="all" sx={{ fontSize: '0.8rem' }}>All Logs</MenuItem>
                <MenuItem value="5m" sx={{ fontSize: '0.8rem' }}>Since 5m</MenuItem>
                <MenuItem value="15m" sx={{ fontSize: '0.8rem' }}>Since 15m</MenuItem>
                <MenuItem value="30m" sx={{ fontSize: '0.8rem' }}>Since 30m</MenuItem>
                <MenuItem value="1h" sx={{ fontSize: '0.8rem' }}>Since 1h</MenuItem>
                <MenuItem value="6h" sx={{ fontSize: '0.8rem' }}>Since 6h</MenuItem>
                <MenuItem value="24h" sx={{ fontSize: '0.8rem' }}>Since 24h</MenuItem>
                <Divider sx={{ my: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} />
                <MenuItem value="pre" sx={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 800 }}>
                  pre (Previous)
                </MenuItem>
              </Select>
            </FormControl>

            {/* Timezone Switch Button (Local Time vs UTC) */}
            <Tooltip title={`Switch Timezone (Currently displaying: ${logsTimeMode === 'local' ? `Local Browser Time [${userTimezone}]` : 'Raw Pod Time [UTC]'})`}>
              <Button
                size="small"
                onClick={() => setLogsTimeMode(logsTimeMode === 'local' ? 'utc' : 'local')}
                startIcon={<AccessTimeIcon sx={{ fontSize: 15 }} />}
                sx={{
                  color: logsTimeMode === 'local' ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#94a3b8' : '#64748b'),
                  bgcolor: logsTimeMode === 'local' ? (isDark ? 'rgba(56, 189, 248, 0.12)' : '#e0f2fe') : (isDark ? '#0a0e17' : '#ffffff'),
                  border: `1px solid ${logsTimeMode === 'local' ? (isDark ? 'rgba(56, 189, 248, 0.35)' : '#7dd3fc') : (isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1')}`,
                  borderRadius: 1.5,
                  height: 30,
                  px: 1.2,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    bgcolor: logsTimeMode === 'local' ? (isDark ? 'rgba(56, 189, 248, 0.2)' : '#bae6fd') : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                    borderColor: logsTimeMode === 'local' ? '#38bdf8' : (isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8'),
                  },
                }}
              >
                {logsTimeMode === 'local' ? 'Local Time' : 'UTC'}
              </Button>
            </Tooltip>

            {/* Search Field */}
            <TextField
              size="small"
              placeholder="Search logs..."
              value={logsSearchQuery}
              onChange={(e) => setLogsSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: 16, mr: 0.5 }} />,
                  endAdornment: logsSearchQuery ? (
                    <IconButton
                      size="small"
                      onClick={() => setLogsSearchQuery('')}
                      sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8', p: 0.2, '&:hover': { color: isDark ? '#f8fafc' : '#0f172a' } }}
                    >
                      <ClearIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  ) : null,
                },
              }}
              sx={{
                width: 170,
                '& .MuiOutlinedInput-root': {
                  bgcolor: isDark ? '#0a0e17' : '#ffffff',
                  color: isDark ? '#f0f6fc' : '#0f172a',
                  fontSize: '0.78rem',
                  height: 30,
                  borderRadius: 1.5,
                  pr: 0.5,
                  '& fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1' },
                  '&:hover fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8' },
                },
              }}
            />

            {/* Live Search Matched Badge */}
            {logsSearchQuery.trim() && (
              <Chip
                label={`${filteredLogsLines.length} matched`}
                size="small"
                sx={{
                  bgcolor: filteredLogsLines.length > 0 ? 'rgba(56,189,248,0.15)' : 'rgba(239,68,68,0.15)',
                  color: filteredLogsLines.length > 0 ? '#38bdf8' : '#ef4444',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  height: 22,
                }}
              />
            )}

            {/* Refresh Button */}
            <Tooltip title="Refresh Logs">
              <IconButton
                size="small"
                onClick={() => handleRefreshLogs(logsTimeFrame)}
                disabled={logsLoading}
                sx={{
                  color: isDark ? '#cbd5e1' : '#475569',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                  borderRadius: 1.5,
                  p: 0.6,
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                  },
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Copy Full Logs Button */}
            <Tooltip title={logsCopied ? "Copied Full Logs to Clipboard!" : "Copy Full Logs to Clipboard"}>
              <Button
                size="small"
                onClick={handleCopyLogsWithFeedback}
                startIcon={logsCopied ? <CheckIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
                sx={{
                  height: 30,
                  px: 1.2,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  color: logsCopied ? '#22c55e' : (isDark ? '#e2e8f0' : '#334155'),
                  bgcolor: logsCopied ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4') : (isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'),
                  border: '1px solid',
                  borderColor: logsCopied ? 'rgba(34, 197, 94, 0.4)' : (isDark ? 'rgba(255,255,255,0.14)' : '#cbd5e1'),
                  borderRadius: 1.5,
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                    borderColor: isDark ? '#38bdf8' : '#0284c7',
                  },
                }}
              >
                {logsCopied ? 'Copied Full Logs' : 'Copy Full Logs'}
              </Button>
            </Tooltip>

            {/* Download Logs Button */}
            <Tooltip title="Download Full Logs as File">
              <Button
                size="small"
                onClick={handleDownloadLogs}
                startIcon={<FileDownloadIcon sx={{ fontSize: 15 }} />}
                sx={{
                  height: 30,
                  px: 1.2,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  color: isDark ? '#e2e8f0' : '#334155',
                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.14)' : '#cbd5e1',
                  borderRadius: 1.5,
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                    borderColor: isDark ? '#38bdf8' : '#0284c7',
                  },
                }}
              >
                Download Logs
              </Button>
            </Tooltip>
          </Box>

          {/* Far Right Corner: Window Controls Pinned to the Right */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {/* Maximize / Restore Window */}
            <Tooltip title={logsDialogMaximized ? 'Restore Window' : 'Maximize Window'}>
              <IconButton
                size="small"
                onClick={() => setLogsDialogMaximized(!logsDialogMaximized)}
                sx={{
                  color: isDark ? '#e2e8f0' : '#475569',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                  borderRadius: 1.5,
                  p: 0.6,
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                  },
                }}
              >
                {logsDialogMaximized ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Close Window */}
            <Tooltip title="Close Window">
              <IconButton
                size="small"
                onClick={() => setLogsDialogOpen(false)}
                sx={{
                  color: isDark ? '#e2e8f0' : '#475569',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                  borderRadius: 1.5,
                  p: 0.6,
                  '&:hover': {
                    bgcolor: 'rgba(239, 68, 68, 0.15)',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogTitle>

        {/* Log Stream Content */}
        <DialogContent
          sx={{
            bgcolor: isDark ? '#0a0e17' : '#f8fafc',
            color: isDark ? '#c9d1d9' : '#0f172a',
            p: 2,
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '0.8rem',
            minHeight: 380,
            height: logsDialogMaximized ? 'calc(100vh - 128px)' : '100%',
            flexGrow: 1,
            overflowY: 'auto',
          }}
        >
          {logsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress sx={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
            </Box>
          ) : filteredLogsLines.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 6, gap: 1.5 }}>
              <Typography variant="body2" sx={{ color: isDark ? '#8b949e' : '#64748b', fontWeight: 600 }}>
                {logsSearchQuery.trim()
                  ? `No log lines matching "${logsSearchQuery}"`
                  : 'No logs available for this resource.'}
              </Typography>
              {logsSearchQuery.trim() && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setLogsSearchQuery('')}
                  sx={{ color: isDark ? '#38bdf8' : '#0284c7', borderColor: isDark ? 'rgba(56,189,248,0.3)' : '#bae6fd', textTransform: 'none', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Clear Search Filter
                </Button>
              )}
            </Box>
          ) : (
            <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', lineHeight: 1.6 }}>
              {filteredLogsLines.map((line, idx) => (
                <React.Fragment key={idx}>
                  {renderEnhancedLogLine(line, logsSearchQuery.trim(), logsTimeMode)}
                </React.Fragment>
              ))}
            </Box>
          )}
        </DialogContent>

        {/* Sleek Status Footer Bar */}
        <DialogActions
          sx={{
            px: 3,
            py: 1.25,
            bgcolor: isDark ? '#0f1422' : '#f8fafc',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {/* Left: Resource Name & Namespace & Pre Indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${logsResourceType === 'deployment' ? 'Deployment' : 'Pod'}: ${selectedResource?.name}`}
              size="small"
              sx={{
                bgcolor: isDark ? 'rgba(56,189,248,0.15)' : '#e0f2fe',
                color: isDark ? '#38bdf8' : '#0284c7',
                fontSize: '0.72rem',
                fontWeight: 800,
                fontFamily: 'monospace',
                height: 24,
                borderRadius: 1.5,
              }}
            />
            <Chip
              label={`Namespace: ${selectedResource?.namespace || 'default'}`}
              size="small"
              sx={{
                bgcolor: isDark ? 'rgba(148,163,184,0.12)' : '#e2e8f0',
                color: isDark ? '#cbd5e1' : '#475569',
                fontSize: '0.7rem',
                fontWeight: 700,
                height: 24,
                borderRadius: 1.5,
              }}
            />
            {(logsTimeFrame === 'pre' || logsPrevious) && (
              <Chip
                label="⚠️ Previous Terminated Container (pre)"
                size="small"
                color="warning"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  height: 24,
                  borderRadius: 1.5,
                }}
              />
            )}
          </Box>

          {/* Right: Line Count Telemetry */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: isDark ? '#8b949e' : '#64748b', fontWeight: 600, fontFamily: 'monospace' }}>
              {logsSearchQuery.trim()
                ? `${filteredLogsLines.length} matched / ${logsContent ? logsContent.split('\n').length : 0} lines`
                : `${logsContent ? logsContent.split('\n').length : 0} lines`}
            </Typography>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Set Container Image Dialog */}
      <Dialog open={imageDialogOpen} onClose={() => !imageLoading && setImageDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Container Image</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Specify the new container image repository and tag for <b>{selectedResource?.name}</b> in namespace <b>{selectedResource?.namespace}</b>.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Image Repository:Tag"
            placeholder="e.g. nginx:1.25-alpine"
            value={imageInputVal}
            onChange={(e) => setImageInputVal(e.target.value)}
            disabled={imageLoading}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setImageDialogOpen(false)} disabled={imageLoading} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleApplyImageUpdate} color="primary" variant="contained" disabled={imageLoading || !imageInputVal.trim()} sx={{ fontWeight: 700 }}>
            {imageLoading ? <CircularProgress size={20} color="inherit" /> : 'Update Image'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scale Deployment Dialog */}
      <Dialog open={scaleDialogOpen} onClose={() => !scaleLoading && setScaleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Scale {selectedResource?.kind || (activeTab === 4 ? 'StatefulSet' : activeTab === 5 ? 'ReplicaSet' : 'Deployment')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Set target replicas count for <b>{selectedResource?.name}</b> in namespace <b>{selectedResource?.namespace || (selectedNamespace !== 'all' ? selectedNamespace : 'default')}</b>.
          </Typography>
          <Box sx={{ px: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">Desired Replicas</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="primary">{scaleReplicas} pods</Typography>
            </Box>
            <Slider value={scaleReplicas} min={0} max={10} step={1} marks valueLabelDisplay="auto" onChange={(e, val) => setScaleReplicas(val as number)} disabled={scaleLoading} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScaleDialogOpen(false)} disabled={scaleLoading} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleApplyScale} variant="contained" disabled={scaleLoading} sx={{ fontWeight: 700 }}>
            {scaleLoading ? <CircularProgress size={20} /> : 'Apply Scale'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restart Pod Dialog */}
      <Dialog open={restartDialogOpen} onClose={() => !restartLoading && setRestartDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Restart Pod</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to terminate and restart pod <b>{selectedResource?.name}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestartDialogOpen(false)} disabled={restartLoading} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleApplyRestart} color="warning" variant="contained" disabled={restartLoading} sx={{ fontWeight: 700 }}>
            {restartLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Restart'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Resource Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleteLoading && setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Resource</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete <b>{selectedResource?.name}</b>? This action is irreversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleApplyDelete} color="error" variant="contained" disabled={deleteLoading} sx={{ fontWeight: 700 }}>
            {deleteLoading ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rollout & Rollback Dialog */}
      <Dialog
        open={rolloutDialogOpen}
        onClose={() => !rolloutLoading && setRolloutDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#0a0e17',
              backgroundImage: 'none',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#0f1422', color: '#f8fafc', px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          Rollout & Rollback: {selectedResource?.name}
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: '#0a0e17' }}>
          {/* Mode Tabs */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Button
              variant={rolloutMode === 'restart' ? 'contained' : 'outlined'}
              onClick={() => setRolloutMode('restart')}
              sx={{ fontWeight: 700, textTransform: 'none', flex: 1 }}
            >
              Rolling Restart
            </Button>
            <Button
              variant={rolloutMode === 'rollback' ? 'contained' : 'outlined'}
              onClick={() => setRolloutMode('rollback')}
              sx={{ fontWeight: 700, textTransform: 'none', flex: 1 }}
            >
              Rollback to Revision
            </Button>
          </Box>

          {rolloutMode === 'restart' ? (
            <Box sx={{ p: 2, bgcolor: '#0f1422', borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 1, fontWeight: 600 }}>
                Trigger a zero-downtime rolling restart for <b>{selectedResource?.name}</b> in namespace <b>{selectedResource?.namespace}</b>.
              </Typography>
              <Typography variant="caption" sx={{ color: '#8b949e' }}>
                Kubernetes will progressively recreate all replica pods with the current configuration.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#8b949e', fontWeight: 700, textTransform: 'uppercase' }}>
                Select Target Historical Revision (--to-revision):
              </Typography>
              {rolloutRevisions && rolloutRevisions.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 220, overflowY: 'auto' }}>
                  {rolloutRevisions.map((rev) => {
                    const isSelected = selectedRolloutRevision === rev.revision;
                    return (
                      <Box
                        key={rev.revision}
                        onClick={() => setSelectedRolloutRevision(rev.revision)}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: isSelected ? 'rgba(56,189,248,0.1)' : '#0f1422',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Chip
                            label={`Revision #${rev.revision}`}
                            size="small"
                            color={isSelected ? 'primary' : 'default'}
                            sx={{ fontWeight: 800, fontSize: '0.7rem', height: 20 }}
                          />
                          <Typography variant="caption" sx={{ color: '#8b949e' }}>{rev.timestamp}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: isSelected ? '#38bdf8' : '#e2e8f0', wordBreak: 'break-all' }}>
                          {rev.image}
                        </Typography>
                        {rev.changeCause && (
                          <Typography variant="caption" sx={{ color: '#8b949e', display: 'block', mt: 0.25 }}>
                            Cause: {rev.changeCause}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: '#8b949e', py: 2 }}>
                  No historical revisions found for this resource.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#0f1422', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Button onClick={() => setRolloutDialogOpen(false)} disabled={rolloutLoading} sx={{ fontWeight: 700, color: '#94a3b8' }}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyRollout}
            color={rolloutMode === 'rollback' ? 'warning' : 'primary'}
            variant="contained"
            disabled={rolloutLoading || (rolloutMode === 'rollback' && !selectedRolloutRevision)}
            sx={{ fontWeight: 700 }}
          >
            {rolloutLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : rolloutMode === 'rollback' ? (
              `Rollback to Revision #${selectedRolloutRevision || '?'}`
            ) : (
              'Trigger Rolling Restart'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => !bulkDeleteLoading && setBulkDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Resources</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete <b>{selectedResources.length}</b> selected resources?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)} disabled={bulkDeleteLoading} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleApplyBulkDelete} color="error" variant="contained" disabled={bulkDeleteLoading} sx={{ fontWeight: 700 }}>
            {bulkDeleteLoading ? <CircularProgress size={20} color="inherit" /> : 'Delete All'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Phase 6: Helm Values Inspection Dialog */}
      <Dialog
        open={helmValuesOpen}
        onClose={() => setHelmValuesOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0f1422' : '#ffffff'),
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorageIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Helm Release Values: {activeHelmRelease?.name}
            </Typography>
            <Chip label={activeHelmRelease?.namespace || 'default'} size="small" sx={{ fontSize: '0.65rem' }} />
            <Chip label={`rev ${activeHelmRelease?.revision || 1}`} size="small" color="primary" sx={{ fontSize: '0.65rem', fontWeight: 750 }} />
          </Box>
          <IconButton size="small" onClick={() => setHelmValuesOpen(false)} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {helmValuesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                overflow: 'hidden',
              }}
            >
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  fontFamily: 'Consolas, Monaco, "Liberation Mono", monospace',
                  fontSize: '0.8rem',
                  lineHeight: 1.55,
                  color: 'text.primary',
                  maxHeight: 460,
                  overflowX: 'auto',
                  overflowY: 'auto',
                  whiteSpace: 'pre',
                }}
              >
                {helmValuesContent}
              </Box>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button
            startIcon={<ContentCopyIcon fontSize="small" />}
            onClick={() => {
              navigator.clipboard.writeText(helmValuesContent);
              setToastSeverity('success');
              setToastMessage('Helm release values copied to clipboard.');
            }}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            Copy Values
          </Button>
          <Button
            variant="contained"
            onClick={() => setHelmValuesOpen(false)}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Phase 6: Helm Rollback Dialog */}
      <Dialog
        open={helmRollbackOpen}
        onClose={() => !helmRollbackLoading && setHelmRollbackOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0f1422' : '#ffffff'),
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon sx={{ color: 'warning.main' }} />
          Rollback Helm Release
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Rollback release <b>{activeHelmRelease?.name}</b> (current revision: <b>{activeHelmRelease?.revision}</b>) to a prior release revision.
          </Typography>
          <TextField
            label="Target Revision"
            type="number"
            size="small"
            fullWidth
            value={helmRollbackRev}
            onChange={(e) => setHelmRollbackRev(Math.max(1, parseInt(e.target.value, 10) || 1))}
            slotProps={{
              htmlInput: { min: 1 },
            }}
            helperText="Enter the historical release revision number to restore."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setHelmRollbackOpen(false)}
            disabled={helmRollbackLoading}
            sx={{ fontWeight: 700, color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleApplyHelmRollback}
            disabled={helmRollbackLoading || helmRollbackRev <= 0}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            {helmRollbackLoading ? <CircularProgress size={20} color="inherit" /> : `Rollback to Rev ${helmRollbackRev}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Phase 6: Helm Uninstall Dialog */}
      <Dialog
        open={helmUninstallOpen}
        onClose={() => !helmUninstallLoading && setHelmUninstallOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0f1422' : '#ffffff'),
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <ClearIcon />
          Uninstall Helm Release
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to uninstall Helm release <b>{activeHelmRelease?.name}</b> in namespace <b>{activeHelmRelease?.namespace}</b>?
          </Typography>
          <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block', fontWeight: 600 }}>
            Warning: This will delete all Kubernetes resources (Deployments, Services, ConfigMaps, Secrets) managed by this release.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setHelmUninstallOpen(false)}
            disabled={helmUninstallLoading}
            sx={{ fontWeight: 700, color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleApplyHelmUninstall}
            disabled={helmUninstallLoading}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            {helmUninstallLoading ? <CircularProgress size={20} color="inherit" /> : 'Uninstall Release'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Multi-Session Exec Terminals */}
      {execSessions.map((session, index) => (
        <TerminalWindow
          key={session.id}
          open={true}
          minimized={session.minimized}
          zIndex={topWindow === session.id || session.id === activeSessionId ? 1330 : 1310 + index}
          onMinimize={() => handleMinimizeExecSession(session.id)}
          onRestore={() => {
            handleRestoreExecSession(session.id);
            setTopWindow(session.id);
          }}
          onClose={() => handleCloseExecSession(session.id)}
          onFocus={() => {
            setActiveSessionId(session.id);
            setTopWindow(session.id);
          }}
          resourceName={session.resourceName}
          resourceType={session.resourceType}
          clusterId={id}
          namespace={session.namespace}
          container={session.container}
        />
      ))}

      {/* Quick Action Dock */}
      <ActionDock
        isConsoleOpen={kubectlShellOpen}
        onToggleConsole={() => {
          if (!kubectlShellOpen) {
            setKubectlShellOpen(true);
            setTopWindow('console');
          } else {
            if (topWindow !== 'console') {
              setTopWindow('console');
            } else {
              setKubectlShellOpen(false);
            }
          }
        }}
        onCreateResource={() => {
          setCreateDialogOpen(true);
          setTopWindow('yamlCreate');
        }}
        onOpenSettings={() => {
          if (!settingsDialogOpen) {
            setSettingsDialogOpen(true);
            setTopWindow('settings');
          } else {
            if (topWindow !== 'settings') {
              setTopWindow('settings');
            } else {
              setSettingsDialogOpen(false);
            }
          }
        }}
        onLogout={() => logout()}
        execSessions={execSessions}
        onToggleSession={(sessionId) => {
          handleToggleExecSession(sessionId);
          setTopWindow(sessionId);
        }}
      />

      {/* KubeConsole Window */}
      {/* Modal Dialog KubeConsole Window */}
      <KubectlTerminalDrawer
        open={kubectlShellOpen}
        onClose={() => setKubectlShellOpen(false)}
        clusterId={id}
        zIndex={topWindow === 'console' ? 1330 : 1315}
        onFocus={() => setTopWindow('console')}
      />

      {/* System & Workspace Settings Dialog */}
      <SettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        zIndex={topWindow === 'settings' ? 1330 : 1315}
        onFocus={() => setTopWindow('settings')}
      />

      {/* Toast Feedback */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toastSeverity} onClose={() => setToastMessage(null)} sx={{ width: '100%', fontWeight: 600, borderRadius: 2 }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
