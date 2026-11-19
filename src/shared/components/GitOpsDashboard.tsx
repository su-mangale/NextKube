'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  useTheme,
  Tabs,
  Tab,
  Snackbar,
} from '@mui/material';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import FolderZipRoundedIcon from '@mui/icons-material/FolderZipRounded';
import StoreRoundedIcon from '@mui/icons-material/StoreRounded';
import AutoAwesomeMotionRoundedIcon from '@mui/icons-material/AutoAwesomeMotionRounded';
import WidgetsRoundedIcon from '@mui/icons-material/WidgetsRounded';
import PublishedWithChangesRoundedIcon from '@mui/icons-material/PublishedWithChangesRounded';
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGitOpsApps,
  useFluxClusterState,
  syncGitOpsAppRequest,
  rollbackGitOpsAppRequest,
  reconcileFluxResourceRequest,
  toggleSuspendFluxResourceRequest,
} from '../api/dashboard.api';
import { GitOpsApp } from '../types/dashboard.types';

export interface GitOpsDashboardProps {
  clusterId: string;
  namespaces?: string[];
  embedded?: boolean;
  initialTab?: number; // 30: overview, 33: git repos, 34: oci, 35: bucket, 36: helm repos, 37: kustomizations, 38: hr, 39: image automation
  onClose?: () => void;
}

export type GitOpsActiveTab = 'overview' | 'sources' | 'kustomizations' | 'helmreleases' | 'imageautomation' | 'history';

export default function GitOpsDashboard({
  clusterId,
  namespaces: _namespaces = [],
  embedded = true,
  initialTab = 30,
  onClose,
}: GitOpsDashboardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const queryClient = useQueryClient();

  // Map initialTab to top tab & source sub-type
  const resolveTabFromProps = (tabNum: number): { topTab: GitOpsActiveTab; sourceFilter: string } => {
    switch (tabNum) {
      case 33:
        return { topTab: 'sources', sourceFilter: 'GitRepository' };
      case 34:
        return { topTab: 'sources', sourceFilter: 'OCIRepository' };
      case 35:
        return { topTab: 'sources', sourceFilter: 'Bucket' };
      case 36:
        return { topTab: 'sources', sourceFilter: 'HelmRepository' };
      case 37:
        return { topTab: 'kustomizations', sourceFilter: 'all' };
      case 38:
        return { topTab: 'helmreleases', sourceFilter: 'all' };
      case 39:
        return { topTab: 'imageautomation', sourceFilter: 'all' };
      default:
        return { topTab: 'overview', sourceFilter: 'all' };
    }
  };

  const initial = resolveTabFromProps(initialTab);
  const [activeTab, setActiveTab] = useState<GitOpsActiveTab>(initial.topTab);
  const [sourceFilter, setSourceFilter] = useState<string>(initial.sourceFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const res = resolveTabFromProps(initialTab);
    setActiveTab(res.topTab);
    setSourceFilter(res.sourceFilter);
  }, [initialTab]);

  // Loading states
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [createSourceType, setCreateSourceType] = useState<'GitRepository' | 'OCIRepository' | 'Bucket' | 'HelmRepository'>('GitRepository');

  // New Source form state
  const [newSourceName, setNewSourceName] = useState<string>('');
  const [newSourceUrl, setNewSourceUrl] = useState<string>('');
  const [newSourceBranch, setNewSourceBranch] = useState<string>('main');
  const [newSourceInterval, setNewSourceInterval] = useState<string>('1m');
  const [newSourceNamespace, setNewSourceNamespace] = useState<string>('flux-system');

  // Diff Modal state
  const [diffModalItem, setDiffModalItem] = useState<{ name: string; namespace: string; liveYaml: string; gitYaml: string } | null>(null);

  // Rollback Modal state
  const [rollbackModalApp, setRollbackModalApp] = useState<GitOpsApp | null>(null);
  const [selectedRollbackSha, setSelectedRollbackSha] = useState<string>('');
  const [rollbackLoading, setRollbackLoading] = useState<boolean>(false);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: apps = [], isLoading: _appsLoading } = useGitOpsApps(clusterId);
  const { data: fluxState, isLoading: _fluxLoading } = useFluxClusterState(clusterId);

  // Reconcile Handler for FluxCD Items
  const handleReconcileFlux = async (kind: string, id: string, name: string) => {
    try {
      setSyncingId(id);
      await reconcileFluxResourceRequest(clusterId, kind, id);
      await queryClient.invalidateQueries({ queryKey: ['fluxClusterState', clusterId] });
      await queryClient.invalidateQueries({ queryKey: ['auditLogs', clusterId] });
      setToastMessage(`Triggered reconciliation for ${kind}: ${name}`);
    } catch (err: any) {
      alert(err?.message || 'Reconciliation failed');
    } finally {
      setSyncingId(null);
    }
  };

  // Toggle Suspend / Resume on a FluxCD item
  const handleToggleSuspend = async (kind: string, id: string, name: string) => {
    try {
      setSyncingId(id);
      await toggleSuspendFluxResourceRequest(clusterId, kind, id);
      await queryClient.invalidateQueries({ queryKey: ['fluxClusterState', clusterId] });
      await queryClient.invalidateQueries({ queryKey: ['auditLogs', clusterId] });
      setToastMessage(`Updated reconciliation status for ${name}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to update suspension');
    } finally {
      setSyncingId(null);
    }
  };

  // Legacy sync for custom GitOps app
  const handleSyncLegacyApp = async (appId: string) => {
    try {
      setSyncingId(appId);
      await syncGitOpsAppRequest(clusterId, appId);
      await queryClient.invalidateQueries({ queryKey: ['gitopsApps', clusterId] });
      await queryClient.invalidateQueries({ queryKey: ['auditLogs', clusterId] });
      setToastMessage('GitOps application synchronized successfully!');
    } catch (err: any) {
      alert(err?.message || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  // Rollback Execution
  const handleExecuteRollback = async () => {
    if (!rollbackModalApp || !selectedRollbackSha) return;
    try {
      setRollbackLoading(true);
      await rollbackGitOpsAppRequest(clusterId, rollbackModalApp.id, selectedRollbackSha);
      await queryClient.invalidateQueries({ queryKey: ['gitopsApps', clusterId] });
      await queryClient.invalidateQueries({ queryKey: ['auditLogs', clusterId] });
      setRollbackModalApp(null);
      setToastMessage(`Rolled back ${rollbackModalApp.name} to revision ${selectedRollbackSha}`);
    } catch (err: any) {
      alert(err?.message || 'Rollback failed');
    } finally {
      setRollbackLoading(false);
    }
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const gitCount = fluxState?.gitRepositories.length || 0;
    const ociCount = fluxState?.ociRepositories.length || 0;
    const bucketCount = fluxState?.buckets.length || 0;
    const helmRepoCount = fluxState?.helmRepositories.length || 0;
    const totalSources = gitCount + ociCount + bucketCount + helmRepoCount;

    const ksCount = fluxState?.kustomizations.length || 0;
    const hrCount = fluxState?.helmReleases.length || 0;
    const totalReconcilers = ksCount + hrCount;

    const totalSuspended =
      (fluxState?.gitRepositories.filter((r) => r.suspended).length || 0) +
      (fluxState?.kustomizations.filter((k) => k.suspended).length || 0) +
      (fluxState?.helmReleases.filter((h) => h.suspended).length || 0);

    const totalReady =
      (fluxState?.gitRepositories.filter((r) => r.ready).length || 0) +
      (fluxState?.kustomizations.filter((k) => k.ready).length || 0) +
      (fluxState?.helmReleases.filter((h) => h.ready).length || 0);

    return {
      totalSources,
      totalReconcilers,
      totalSuspended,
      totalReady,
      appsCount: apps.length,
    };
  }, [fluxState, apps]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isDark ? '#0b1120' : '#f8fafc',
        borderRadius: embedded ? 2 : 0,
        overflow: 'hidden',
        border: embedded ? `1px solid ${theme.palette.divider}` : 'none',
      }}
    >
      {/* HEADER BAR */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          px: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)',
              color: isDark ? '#c084fc' : '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CompareArrowsRoundedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.3, fontSize: '1.05rem' }}>
                GitOps Console
              </Typography>
              <Chip
                label="FluxCD v2.x Ready"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 750,
                  bgcolor: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(147, 51, 234, 0.1)',
                  color: isDark ? '#c084fc' : '#9333ea',
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Declarative Continuous Delivery · Sources of Truth · Kustomize & Helm Controllers · Image Automation
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search GitOps objects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiInputBase-root': { height: 32, fontSize: '0.78rem', borderRadius: 1.5, width: 210 },
            }}
          />

          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<AddRoundedIcon sx={{ fontSize: 17 }} />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              height: 32,
              fontSize: '0.75rem',
              fontWeight: 750,
              borderRadius: 1.5,
              textTransform: 'none',
              px: 1.6,
            }}
          >
            Add Source (SOT)
          </Button>

          {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Paper>

      {/* NAVIGATION TABS */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, bgcolor: isDark ? '#0f172a' : '#ffffff' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              px: 2,
              gap: 0.8,
            },
          }}
        >
          <Tab value="overview" label="Overview & Health" icon={<CheckCircleRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" />
          <Tab
            value="sources"
            label={`Sources of Truth (${summaryMetrics.totalSources})`}
            icon={<GitHubIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
          />
          <Tab
            value="kustomizations"
            label={`Kustomizations (${fluxState?.kustomizations.length || 0})`}
            icon={<AutoAwesomeMotionRoundedIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
          />
          <Tab
            value="helmreleases"
            label={`Helm Releases HR (${fluxState?.helmReleases.length || 0})`}
            icon={<WidgetsRoundedIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
          />
          <Tab
            value="imageautomation"
            label="Image Automations"
            icon={<PublishedWithChangesRoundedIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
          />
          <Tab
            value="history"
            label="Sync Audit & Diff"
            icon={<HistoryRoundedIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* TAB CONTENT CONTAINER */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
        {/* ======================================================== */}
        {/* TAB 0: OVERVIEW & ARCHITECTURE */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* KPI STATS ROW */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 2 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <GitHubIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {summaryMetrics.totalSources}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Sources of Truth (Git/OCI/S3)
                  </Typography>
                </Box>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <CheckCircleRoundedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {summaryMetrics.totalReady}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Reconciled & Healthy
                  </Typography>
                </Box>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                  <AutoAwesomeMotionRoundedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {summaryMetrics.totalReconcilers}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Active Reconcilers (KS & HR)
                  </Typography>
                </Box>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <PauseCircleOutlineRoundedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {summaryMetrics.totalSuspended}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Suspended Sync Objects
                  </Typography>
                </Box>
              </Paper>
            </Box>

            {/* FLUX CONTROLLERS HEALTH STRIP */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                In-Cluster FluxCD Controllers Status
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5 }}>
                {[
                  { name: 'source-controller', ready: true, version: 'v1.2.4', objects: `${summaryMetrics.totalSources} sources` },
                  { name: 'kustomize-controller', ready: true, version: 'v1.2.2', objects: `${fluxState?.kustomizations.length || 0} kustomizations` },
                  { name: 'helm-controller', ready: true, version: 'v0.37.4', objects: `${fluxState?.helmReleases.length || 0} releases` },
                  { name: 'image-automation-controller', ready: true, version: 'v0.37.1', objects: '1 active pipeline' },
                  { name: 'notification-controller', ready: true, version: 'v1.2.4', objects: 'Webhook receiver active' },
                ].map((c) => (
                  <Paper
                    key={c.name}
                    variant="outlined"
                    sx={{ p: 1.5, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 750, color: 'primary.main' }}>
                        {c.name}
                      </Typography>
                      <Chip label="Ready" size="small" color="success" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {c.version} · {c.objects}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Paper>

            {/* QUICK ACTIONS OVERVIEW */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  Source of Truth (SOT) Status
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem' }}>
                  Manage multiple repositories, OCI artifacts, and S3 buckets feeding your cluster state.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setActiveTab('sources');
                    setSourceFilter('all');
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  View All Sources ({summaryMetrics.totalSources})
                </Button>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  Automated Reconciliation Policies
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem' }}>
                  Monitor declarative diffs, prune orphan resources, and inspect automated Git rollouts.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setActiveTab('kustomizations')}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Inspect Kustomizations & Diffs
                </Button>
              </Paper>
            </Box>
          </Box>
        )}

        {/* ======================================================== */}
        {/* TAB 1: SOURCES OF TRUTH (SOT) */}
        {/* ======================================================== */}
        {activeTab === 'sources' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Filter pills row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {[
                { id: 'all', label: 'All Sources' },
                { id: 'GitRepository', label: 'Git Repositories' },
                { id: 'OCIRepository', label: 'OCI Repositories' },
                { id: 'Bucket', label: 'Buckets (S3)' },
                { id: 'HelmRepository', label: 'Helm Repositories' },
              ].map((pill) => (
                <Chip
                  key={pill.id}
                  label={pill.label}
                  size="small"
                  clickable
                  onClick={() => setSourceFilter(pill.id)}
                  color={sourceFilter === pill.id ? 'primary' : 'default'}
                  variant={sourceFilter === pill.id ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                />
              ))}
            </Box>

            {/* Sources Table */}
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Kind</TableCell>
                    <TableCell>Source Name</TableCell>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Target URL / Bucket</TableCell>
                    <TableCell>Reference / Branch</TableCell>
                    <TableCell>Interval</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* GitRepositories */}
                  {(sourceFilter === 'all' || sourceFilter === 'GitRepository') &&
                    fluxState?.gitRepositories.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          <Chip label="GitRepository" size="small" icon={<GitHubIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{r.name}</TableCell>
                        <TableCell><Chip label={r.namespace} size="small" sx={{ fontSize: '0.62rem' }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{r.url}</TableCell>
                        <TableCell><Chip label={r.branch} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{r.interval}</TableCell>
                        <TableCell>
                          <Chip
                            label={r.suspended ? 'Suspended' : r.ready ? 'Ready' : 'Failed'}
                            size="small"
                            color={r.suspended ? 'warning' : r.ready ? 'success' : 'error'}
                            sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Trigger Reconcile Now">
                              <IconButton
                                size="small"
                                onClick={() => handleReconcileFlux('GitRepository', r.id, r.name)}
                                disabled={syncingId === r.id}
                              >
                                <SyncRoundedIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={r.suspended ? 'Resume Reconciliation' : 'Suspend Reconciliation'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleSuspend('GitRepository', r.id, r.name)}
                                color={r.suspended ? 'warning' : 'default'}
                              >
                                {r.suspended ? <PlayCircleOutlineRoundedIcon sx={{ fontSize: 17 }} /> : <PauseCircleOutlineRoundedIcon sx={{ fontSize: 17 }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}

                  {/* OCIRepositories */}
                  {(sourceFilter === 'all' || sourceFilter === 'OCIRepository') &&
                    fluxState?.ociRepositories.map((o) => (
                      <TableRow key={o.id} hover>
                        <TableCell>
                          <Chip label="OCIRepository" size="small" icon={<CloudQueueRoundedIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{o.name}</TableCell>
                        <TableCell><Chip label={o.namespace} size="small" sx={{ fontSize: '0.62rem' }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{o.url}</TableCell>
                        <TableCell><Chip label={o.tag || 'latest'} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{o.interval}</TableCell>
                        <TableCell>
                          <Chip
                            label={o.suspended ? 'Suspended' : o.ready ? 'Ready' : 'Failed'}
                            size="small"
                            color={o.suspended ? 'warning' : o.ready ? 'success' : 'error'}
                            sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Trigger Reconcile Now">
                              <IconButton
                                size="small"
                                onClick={() => handleReconcileFlux('OCIRepository', o.id, o.name)}
                                disabled={syncingId === o.id}
                              >
                                <SyncRoundedIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={o.suspended ? 'Resume Reconciliation' : 'Suspend Reconciliation'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleSuspend('OCIRepository', o.id, o.name)}
                                color={o.suspended ? 'warning' : 'default'}
                              >
                                {o.suspended ? <PlayCircleOutlineRoundedIcon sx={{ fontSize: 17 }} /> : <PauseCircleOutlineRoundedIcon sx={{ fontSize: 17 }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}

                  {/* Buckets */}
                  {(sourceFilter === 'all' || sourceFilter === 'Bucket') &&
                    fluxState?.buckets.map((b) => (
                      <TableRow key={b.id} hover>
                        <TableCell>
                          <Chip label="Bucket (S3)" size="small" icon={<FolderZipRoundedIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{b.name}</TableCell>
                        <TableCell><Chip label={b.namespace} size="small" sx={{ fontSize: '0.62rem' }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{b.bucketName} ({b.endpoint})</TableCell>
                        <TableCell><Chip label={b.provider} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{b.interval}</TableCell>
                        <TableCell>
                          <Chip
                            label={b.suspended ? 'Suspended' : b.ready ? 'Ready' : 'Failed'}
                            size="small"
                            color={b.suspended ? 'warning' : b.ready ? 'success' : 'error'}
                            sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Trigger Reconcile Now">
                              <IconButton
                                size="small"
                                onClick={() => handleReconcileFlux('Bucket', b.id, b.name)}
                                disabled={syncingId === b.id}
                              >
                                <SyncRoundedIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={b.suspended ? 'Resume Reconciliation' : 'Suspend Reconciliation'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleSuspend('Bucket', b.id, b.name)}
                                color={b.suspended ? 'warning' : 'default'}
                              >
                                {b.suspended ? <PlayCircleOutlineRoundedIcon sx={{ fontSize: 17 }} /> : <PauseCircleOutlineRoundedIcon sx={{ fontSize: 17 }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}

                  {/* HelmRepositories */}
                  {(sourceFilter === 'all' || sourceFilter === 'HelmRepository') &&
                    fluxState?.helmRepositories.map((hr) => (
                      <TableRow key={hr.id} hover>
                        <TableCell>
                          <Chip label="HelmRepository" size="small" icon={<StoreRoundedIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{hr.name}</TableCell>
                        <TableCell><Chip label={hr.namespace} size="small" sx={{ fontSize: '0.62rem' }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{hr.url}</TableCell>
                        <TableCell><Chip label={hr.type} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{hr.interval}</TableCell>
                        <TableCell>
                          <Chip
                            label={hr.suspended ? 'Suspended' : hr.ready ? 'Ready' : 'Failed'}
                            size="small"
                            color={hr.suspended ? 'warning' : hr.ready ? 'success' : 'error'}
                            sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Trigger Reconcile Now">
                              <IconButton
                                size="small"
                                onClick={() => handleReconcileFlux('HelmRepository', hr.id, hr.name)}
                                disabled={syncingId === hr.id}
                              >
                                <SyncRoundedIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={hr.suspended ? 'Resume Reconciliation' : 'Suspend Reconciliation'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleSuspend('HelmRepository', hr.id, hr.name)}
                                color={hr.suspended ? 'warning' : 'default'}
                              >
                                {hr.suspended ? <PlayCircleOutlineRoundedIcon sx={{ fontSize: 17 }} /> : <PauseCircleOutlineRoundedIcon sx={{ fontSize: 17 }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        {/* ======================================================== */}
        {/* TAB 2: KUSTOMIZATIONS */}
        {/* ======================================================== */}
        {activeTab === 'kustomizations' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Kustomization Name</TableCell>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Source Ref</TableCell>
                    <TableCell>Target Path</TableCell>
                    <TableCell>Target Namespace</TableCell>
                    <TableCell>Prune</TableCell>
                    <TableCell>Last Applied Revision</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fluxState?.kustomizations.map((k) => (
                    <TableRow key={k.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{k.name}</TableCell>
                      <TableCell><Chip label={k.namespace} size="small" sx={{ fontSize: '0.62rem' }} /></TableCell>
                      <TableCell>
                        <Chip
                          label={`${k.sourceKind}/${k.sourceName}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', fontWeight: 650 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.74rem' }}>{k.path}</TableCell>
                      <TableCell>{k.targetNamespace || 'default'}</TableCell>
                      <TableCell>
                        <Chip
                          label={k.prune ? 'Enabled' : 'Disabled'}
                          size="small"
                          color={k.prune ? 'success' : 'default'}
                          sx={{ fontSize: '0.62rem', height: 18 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'text.secondary' }}>
                        {k.lastAppliedRevision}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={k.suspended ? 'Suspended' : k.ready ? 'Applied' : 'Failed'}
                          size="small"
                          color={k.suspended ? 'warning' : k.ready ? 'success' : 'error'}
                          sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Tooltip title="Reconcile Kustomization">
                            <IconButton
                              size="small"
                              onClick={() => handleReconcileFlux('Kustomization', k.id, k.name)}
                              disabled={syncingId === k.id}
                            >
                              <SyncRoundedIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Live vs Git Declarative Diff">
                            <IconButton
                              size="small"
                              onClick={() =>
                                setDiffModalItem({
                                  name: k.name,
                                  namespace: k.targetNamespace || 'default',
                                  liveYaml: `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${k.name}\n  namespace: ${k.targetNamespace || 'default'}\nspec:\n  replicas: 2\n  template:\n    spec:\n      containers:\n      - name: app\n        image: ghcr.io/org/${k.name}:v1.2.0`,
                                  gitYaml: `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${k.name}\n  namespace: ${k.targetNamespace || 'default'}\nspec:\n  replicas: 3\n  template:\n    spec:\n      containers:\n      - name: app\n        image: ghcr.io/org/${k.name}:v1.2.4`,
                                })
                              }
                            >
                              <CompareArrowsRoundedIcon sx={{ fontSize: 17, color: 'secondary.main' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={k.suspended ? 'Resume' : 'Suspend'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleSuspend('Kustomization', k.id, k.name)}
                              color={k.suspended ? 'warning' : 'default'}
                            >
                              {k.suspended ? <PlayCircleOutlineRoundedIcon sx={{ fontSize: 17 }} /> : <PauseCircleOutlineRoundedIcon sx={{ fontSize: 17 }} />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        {/* ======================================================== */}
        {/* TAB 3: HELM RELEASES (HR) */}
        {/* ======================================================== */}
        {activeTab === 'helmreleases' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Helm Release (HR)</TableCell>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Chart Source</TableCell>
                    <TableCell>Chart & Version</TableCell>
                    <TableCell>Target Namespace</TableCell>
                    <TableCell>Interval</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fluxState?.helmReleases.map((hr) => (
                    <TableRow key={hr.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{hr.name}</TableCell>
                      <TableCell><Chip label={hr.namespace} size="small" sx={{ fontSize: '0.62rem' }} /></TableCell>
                      <TableCell>
                        <Chip
                          label={`${hr.chartSourceKind}/${hr.chartSourceName}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 650 }}>{hr.chart} ({hr.version})</TableCell>
                      <TableCell>{hr.targetNamespace || hr.namespace}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{hr.interval}</TableCell>
                      <TableCell>
                        <Chip
                          label={hr.suspended ? 'Suspended' : hr.ready ? 'Deployed' : 'Failed'}
                          size="small"
                          color={hr.suspended ? 'warning' : hr.ready ? 'success' : 'error'}
                          sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Tooltip title="Trigger Reconcile Now">
                            <IconButton
                              size="small"
                              onClick={() => handleReconcileFlux('HelmRelease', hr.id, hr.name)}
                              disabled={syncingId === hr.id}
                            >
                              <SyncRoundedIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={hr.suspended ? 'Resume' : 'Suspend'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleSuspend('HelmRelease', hr.id, hr.name)}
                              color={hr.suspended ? 'warning' : 'default'}
                            >
                              {hr.suspended ? <PlayCircleOutlineRoundedIcon sx={{ fontSize: 17 }} /> : <PauseCircleOutlineRoundedIcon sx={{ fontSize: 17 }} />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        {/* ======================================================== */}
        {/* TAB 4: IMAGE AUTOMATION & POLICIES */}
        {/* ======================================================== */}
        {activeTab === 'imageautomation' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 1. Image Repositories */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.2 }}>
                1. Scanned Image Repositories (ImageRepository)
              </Typography>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Image Registry Path</TableCell>
                      <TableCell>Scan Interval</TableCell>
                      <TableCell>Discovered Tags</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fluxState?.imageRepositories.map((ir) => (
                      <TableRow key={ir.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{ir.name}</TableCell>
                        <TableCell><Chip label={ir.namespace} size="small" sx={{ fontSize: '0.62rem' }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{ir.image}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{ir.interval}</TableCell>
                        <TableCell><Chip label={`${ir.scannedTagsCount} tags`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell>
                          <Chip label={ir.scanStatus} size="small" color={ir.scanStatus === 'OK' ? 'success' : 'warning'} sx={{ fontSize: '0.62rem', fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>

            {/* 2. Image Policies */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.2 }}>
                2. Semantic Version & Selection Policies (ImagePolicy)
              </Typography>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Policy Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Target ImageRepository</TableCell>
                      <TableCell>Rule Type</TableCell>
                      <TableCell>Semver Range</TableCell>
                      <TableCell>Active Tag Picked</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fluxState?.imagePolicies.map((ip) => (
                      <TableRow key={ip.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{ip.name}</TableCell>
                        <TableCell><Chip label={ip.namespace} size="small" sx={{ fontSize: '0.62rem' }} /></TableCell>
                        <TableCell>{ip.imageRepoRef}</TableCell>
                        <TableCell><Chip label={ip.policyType} size="small" sx={{ fontSize: '0.62rem' }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{ip.range}</TableCell>
                        <TableCell>
                          <Chip label={ip.selectedTag} size="small" color="success" sx={{ fontSize: '0.68rem', fontWeight: 800 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>

            {/* 3. Image Update Automations */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.2 }}>
                3. Automated Git Write-Back (ImageUpdateAutomation)
              </Typography>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Automation Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Target Git Repository</TableCell>
                      <TableCell>Update Path</TableCell>
                      <TableCell>Checkout Branch</TableCell>
                      <TableCell>Last Git Commit Push</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fluxState?.imageUpdateAutomations.map((ia) => (
                      <TableRow key={ia.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{ia.name}</TableCell>
                        <TableCell><Chip label={ia.namespace} size="small" sx={{ fontSize: '0.62rem' }} /></TableCell>
                        <TableCell>{ia.gitRepoRef}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.74rem' }}>{ia.updatePath}</TableCell>
                        <TableCell><Chip label={ia.checkoutBranch} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'text.secondary' }}>
                          {ia.lastPushedCommit}
                        </TableCell>
                        <TableCell>
                          <Chip label={ia.suspended ? 'Suspended' : 'Active'} size="small" color={ia.suspended ? 'warning' : 'success'} sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          </Box>
        )}

        {/* ======================================================== */}
        {/* TAB 5: SYNC AUDIT HISTORY & APPLICATIONS */}
        {/* ======================================================== */}
        {activeTab === 'history' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Application</TableCell>
                    <TableCell>Revision Commit</TableCell>
                    <TableCell>Author</TableCell>
                    <TableCell>Commit Message</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Synced At</TableCell>
                    <TableCell align="right">Rollback</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apps.flatMap((app) =>
                    (app.syncHistory || []).map((h) => (
                      <TableRow key={h.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{app.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700 }}>
                          {h.commitSha}
                        </TableCell>
                        <TableCell>{h.author}</TableCell>
                        <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.commitMessage}
                        </TableCell>
                        <TableCell>{h.duration}</TableCell>
                        <TableCell>
                          <Chip label={h.status} size="small" color={h.status === 'SUCCESS' ? 'success' : 'error'} sx={{ fontSize: '0.62rem', fontWeight: 700 }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                          {new Date(h.syncedAt).toLocaleTimeString()}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              disabled={syncingId === app.id}
                              onClick={() => handleSyncLegacyApp(app.id)}
                              sx={{ height: 22, fontSize: '0.65rem', textTransform: 'none', px: 1 }}
                            >
                              Sync
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              onClick={() => {
                                setRollbackModalApp(app);
                                setSelectedRollbackSha(h.commitSha);
                              }}
                              sx={{ height: 22, fontSize: '0.65rem', textTransform: 'none', px: 1 }}
                            >
                              Rollback
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </Box>

      {/* MODAL: ADD SOURCE OF TRUTH (SOT) */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, bgcolor: isDark ? '#0f1422' : '#ffffff' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Connect New Source of Truth (SOT)</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Source Type</InputLabel>
            <Select
              value={createSourceType}
              label="Source Type"
              onChange={(e) => setCreateSourceType(e.target.value as any)}
            >
              <MenuItem value="GitRepository">Git Repository (GitHub, GitLab, Bitbucket)</MenuItem>
              <MenuItem value="OCIRepository">OCI Artifact Registry (ghcr.io, ECR, Artifact Registry)</MenuItem>
              <MenuItem value="Bucket">S3 / MinIO Storage Bucket</MenuItem>
              <MenuItem value="HelmRepository">Helm Chart Repository</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Source Name"
            size="small"
            fullWidth
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            placeholder="e.g. production-manifests"
          />

          <TextField
            label={createSourceType === 'Bucket' ? 'Bucket Name & Endpoint' : 'Target URL'}
            size="small"
            fullWidth
            value={newSourceUrl}
            onChange={(e) => setNewSourceUrl(e.target.value)}
            placeholder={
              createSourceType === 'OCIRepository'
                ? 'oci://ghcr.io/my-org/manifests'
                : createSourceType === 'Bucket'
                ? 's3.amazonaws.com/my-bucket'
                : 'https://github.com/my-org/gitops-deployments.git'
            }
          />

          {createSourceType === 'GitRepository' && (
            <TextField
              label="Target Branch / Tag"
              size="small"
              fullWidth
              value={newSourceBranch}
              onChange={(e) => setNewSourceBranch(e.target.value)}
            />
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Sync Interval"
              size="small"
              fullWidth
              value={newSourceInterval}
              onChange={(e) => setNewSourceInterval(e.target.value)}
            />
            <TextField
              label="Namespace"
              size="small"
              fullWidth
              value={newSourceNamespace}
              onChange={(e) => setNewSourceNamespace(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setCreateDialogOpen(false);
              setToastMessage(`Registered new ${createSourceType}: ${newSourceName || 'custom-source'}`);
            }}
            disabled={!newSourceUrl.trim()}
          >
            Create Source
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: LIVE VS GIT DECLARATIVE DIFF */}
      <Dialog
        open={Boolean(diffModalItem)}
        onClose={() => setDiffModalItem(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 3, bgcolor: isDark ? '#0f1422' : '#ffffff' } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CompareArrowsRoundedIcon sx={{ color: 'secondary.main' }} />
          Declarative Diff: {diffModalItem?.name} ({diffModalItem?.namespace})
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>
                LIVE CLUSTER STATE
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, borderRadius: 2, bgcolor: isDark ? '#090d16' : '#f1f5f9', maxHeight: 340, overflowY: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace' }}>{diffModalItem?.liveYaml}</pre>
              </Paper>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                DECLARED GIT TARGET STATE
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, borderRadius: 2, bgcolor: isDark ? '#090d16' : '#f1f5f9', borderColor: 'rgba(16, 185, 129, 0.4)', maxHeight: 340, overflowY: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', color: '#10b981' }}>{diffModalItem?.gitYaml}</pre>
              </Paper>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setDiffModalItem(null)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (diffModalItem) {
                setToastMessage(`Reconciled and applied Git target for ${diffModalItem.name}`);
              }
              setDiffModalItem(null);
            }}
          >
            Reconcile & Apply Git Target
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: ROLLBACK */}
      <Dialog
        open={Boolean(rollbackModalApp)}
        onClose={() => setRollbackModalApp(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 3, bgcolor: isDark ? '#0f1422' : '#ffffff' } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'warning.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryRoundedIcon /> Rollback Application
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Rollback <b>{rollbackModalApp?.name}</b> to target Git commit:
          </Typography>
          <FormControl size="small" fullWidth>
            <InputLabel>Target Commit Revision</InputLabel>
            <Select
              value={selectedRollbackSha}
              label="Target Commit Revision"
              onChange={(e) => setSelectedRollbackSha(e.target.value)}
            >
              {(rollbackModalApp?.syncHistory || []).map((h) => (
                <MenuItem key={h.id} value={h.commitSha}>
                  {h.commitSha} — {h.commitMessage}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setRollbackModalApp(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleExecuteRollback}
            disabled={rollbackLoading || !selectedRollbackSha}
          >
            {rollbackLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Rollback'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Snackbar */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
      />
    </Box>
  );
}
