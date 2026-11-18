'use client';

import React, { useState, useMemo } from 'react';
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
  FormControlLabel,
  Switch,
  CircularProgress,
  Tooltip,
  Alert,
  useTheme,
  Tabs,
  Tab,
} from '@mui/material';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGitOpsApps,
  syncGitOpsAppRequest,
  rollbackGitOpsAppRequest,
  createGitOpsAppRequest,
  deleteGitOpsAppRequest,
} from '../api/dashboard.api';
import { GitOpsApp } from '../types/dashboard.types';

export interface GitOpsDashboardProps {
  clusterId: string;
  namespaces?: string[];
  embedded?: boolean;
  onClose?: () => void;
}

export default function GitOpsDashboard({
  clusterId,
  namespaces = [],
  embedded = true,
  onClose,
}: GitOpsDashboardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'apps' | 'repos' | 'history'>('apps');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Loading states
  const [syncingAppId, setSyncingAppId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);

  // New App form state
  const [newAppName, setNewAppName] = useState<string>('');
  const [newRepoUrl, setNewRepoUrl] = useState<string>('https://github.com/nextkube/gitops-deployments.git');
  const [newTargetRevision, setNewTargetRevision] = useState<string>('main');
  const [newPath, setNewPath] = useState<string>('manifests/production');
  const [newNamespace, setNewNamespace] = useState<string>(namespaces[0] || 'default');
  const [newAutoSync, setNewAutoSync] = useState<boolean>(true);
  const [newSelfHeal, setNewSelfHeal] = useState<boolean>(true);
  const [newAutoPrune, setNewAutoPrune] = useState<boolean>(false);

  // Diff Modal state
  const [diffModalApp, setDiffModalApp] = useState<GitOpsApp | null>(null);

  // Rollback Modal state
  const [rollbackModalApp, setRollbackModalApp] = useState<GitOpsApp | null>(null);
  const [selectedRollbackSha, setSelectedRollbackSha] = useState<string>('');
  const [rollbackLoading, setRollbackLoading] = useState<boolean>(false);

  // Notification message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: apps = [], isLoading, refetch } = useGitOpsApps(clusterId);

  const handleSyncNow = async (appId: string) => {
    try {
      setSyncingAppId(appId);
      await syncGitOpsAppRequest(clusterId, appId);
      await queryClient.invalidateQueries({ queryKey: ['gitopsApps', clusterId] });
      await queryClient.invalidateQueries({ queryKey: ['auditLogs', clusterId] });
      setToastMessage('GitOps application synchronized successfully!');
    } catch (err: any) {
      alert(err?.message || 'Sync failed');
    } finally {
      setSyncingAppId(null);
    }
  };

  const handleCreateApp = async () => {
    if (!newAppName.trim() || !newRepoUrl.trim()) return;
    try {
      setCreateLoading(true);
      await createGitOpsAppRequest(clusterId, {
        name: newAppName.trim(),
        repoUrl: newRepoUrl.trim(),
        targetRevision: newTargetRevision.trim() || 'main',
        path: newPath.trim() || 'manifests',
        destinationNamespace: newNamespace,
        autoSync: newAutoSync,
        selfHeal: newSelfHeal,
        autoPrune: newAutoPrune,
      });
      await queryClient.invalidateQueries({ queryKey: ['gitopsApps', clusterId] });
      await queryClient.invalidateQueries({ queryKey: ['auditLogs', clusterId] });
      setCreateDialogOpen(false);
      setNewAppName('');
      setToastMessage(`GitOps application '${newAppName.trim()}' created!`);
    } catch (err: any) {
      alert(err?.message || 'Failed to create GitOps application');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteApp = async (appId: string, appName: string) => {
    if (!confirm(`Are you sure you want to unregister GitOps application '${appName}'?`)) return;
    try {
      await deleteGitOpsAppRequest(clusterId, appId);
      await queryClient.invalidateQueries({ queryKey: ['gitopsApps', clusterId] });
      await queryClient.invalidateQueries({ queryKey: ['auditLogs', clusterId] });
      setToastMessage(`GitOps application '${appName}' removed.`);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete application');
    }
  };

  const handleExecuteRollback = async () => {
    if (!rollbackModalApp || !selectedRollbackSha) return;
    try {
      setRollbackLoading(true);
      await rollbackGitOpsAppRequest(clusterId, rollbackModalApp.id, selectedRollbackSha);
      await queryClient.invalidateQueries({ queryKey: ['gitopsApps', clusterId] });
      await queryClient.invalidateQueries({ queryKey: ['auditLogs', clusterId] });
      setRollbackModalApp(null);
      setToastMessage(`Rolled back '${rollbackModalApp.name}' to commit ${selectedRollbackSha}!`);
    } catch (err: any) {
      alert(err?.message || 'Rollback failed');
    } finally {
      setRollbackLoading(false);
    }
  };

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        app.name.toLowerCase().includes(q) ||
        app.repoUrl.toLowerCase().includes(q) ||
        app.path.toLowerCase().includes(q) ||
        app.destinationNamespace.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        app.syncStatus.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [apps, searchQuery, statusFilter]);

  const kpis = useMemo(() => {
    const total = apps.length;
    const synced = apps.filter((a) => a.syncStatus === 'Synced').length;
    const outOfSync = apps.filter((a) => a.syncStatus === 'OutOfSync').length;
    const autoSyncCount = apps.filter((a) => a.autoSync).length;
    return { total, synced, outOfSync, autoSyncCount };
  }, [apps]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isDark ? 'background.default' : '#f8fafc',
        overflowY: 'auto',
        p: embedded ? 3 : 0,
      }}
    >
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)',
              color: '#a855f7',
            }}
          >
            <CompareArrowsRoundedIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              GitOps Continuous Delivery Engine
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Declarative Kubernetes synchronization, automated self-healing & revision rollback
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SyncRoundedIcon fontSize="small" />}
            onClick={() => refetch()}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Refresh State
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<AddRoundedIcon fontSize="small" />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            New Application
          </Button>
          {!embedded && onClose && (
            <IconButton onClick={onClose} size="small">
              <CloseRoundedIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Toast Notification Alert */}
      {toastMessage && (
        <Alert
          severity="success"
          onClose={() => setToastMessage(null)}
          sx={{ mb: 2.5, borderRadius: 2, fontWeight: 600 }}
        >
          {toastMessage}
        </Alert>
      )}

      {/* KPI Summary Strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
            borderLeft: '4px solid #a855f7',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
            Managed GitOps Apps
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
            {kpis.total}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tracking Git declarative state
          </Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
            borderLeft: '4px solid #10b981',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
            Fully Synced
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#10b981' }}>
            {kpis.synced} / {kpis.total}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cluster in-sync with Git source
          </Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
            Drift / Out of Sync
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: kpis.outOfSync > 0 ? '#f59e0b' : 'text.primary' }}>
            {kpis.outOfSync}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {kpis.outOfSync > 0 ? 'Requires reconciliation' : 'Zero drift detected'}
          </Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
            borderLeft: '4px solid #38bdf8',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
            Self-Healing Active
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#38bdf8' }}>
            {kpis.autoSyncCount} Apps
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Automated drift reconciliation
          </Typography>
        </Paper>
      </Box>

      {/* Sub Tabs: Applications, Git Repositories, Sync History */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
            },
          }}
        >
          <Tab value="apps" label={`GitOps Applications (${apps.length})`} />
          <Tab value="repos" label="Git Repositories (1)" />
          <Tab value="history" label="Reconciliation & Rollback History" />
        </Tabs>
      </Box>

      {/* TAB 1: APPLICATIONS LIST */}
      {activeTab === 'apps' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Search and Filter Strip */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <TextField
              size="small"
              placeholder="Filter GitOps apps by name, repo, or namespace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 360 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: 2, fontSize: '0.82rem' }}
              >
                <MenuItem value="all">All Sync States</MenuItem>
                <MenuItem value="synced">Synced Only</MenuItem>
                <MenuItem value="outofsync">Out of Sync Only</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Applications Table */}
          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Application</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Git Source Repository & Path</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Destination</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sync Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Health</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Auto-Sync</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Last Target Commit</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Operations</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                      <CircularProgress size={32} />
                      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                        Loading GitOps application states...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredApps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      No GitOps applications match your search query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApps.map((app) => {
                    const isSynced = app.syncStatus === 'Synced';
                    const isSyncing = syncingAppId === app.id;

                    return (
                      <TableRow key={app.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 750, color: 'primary.main' }}>
                            {app.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {app.liveResourcesCount} live resources
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <GitHubIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                              {app.repoUrl.replace('https://github.com/', '')}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontFamily: 'monospace' }}>
                            branch: <b>{app.targetRevision}</b> • path: {app.path}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip label={app.destinationNamespace} size="small" sx={{ fontWeight: 700, fontSize: '0.68rem', borderRadius: 1 }} />
                        </TableCell>

                        <TableCell>
                          <Chip
                            icon={isSynced ? <CheckCircleRoundedIcon /> : <WarningAmberRoundedIcon />}
                            label={app.syncStatus}
                            size="small"
                            color={isSynced ? 'success' : 'warning'}
                            sx={{ fontWeight: 800, fontSize: '0.68rem', borderRadius: 1 }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={app.healthStatus}
                            size="small"
                            color={app.healthStatus === 'Healthy' ? 'success' : 'info'}
                            sx={{ fontWeight: 700, fontSize: '0.68rem', borderRadius: 1 }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={app.autoSync ? 'Enabled' : 'Manual'}
                            size="small"
                            variant="outlined"
                            color={app.autoSync ? 'primary' : 'default'}
                            sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700 }}>
                            {app.lastSyncedCommit.sha}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {app.lastSyncedCommit.message}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ pr: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button
                              size="small"
                              variant={isSynced ? 'outlined' : 'contained'}
                              color={isSynced ? 'inherit' : 'primary'}
                              onClick={() => handleSyncNow(app.id)}
                              disabled={isSyncing}
                              startIcon={isSyncing ? <CircularProgress size={14} color="inherit" /> : <SyncRoundedIcon fontSize="small" />}
                              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0.3 }}
                            >
                              {isSyncing ? 'Syncing...' : 'Sync Now'}
                            </Button>

                            <Tooltip title="View Live vs Git Manifest Diff">
                              <IconButton
                                size="small"
                                onClick={() => setDiffModalApp(app)}
                                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                              >
                                <CompareArrowsRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Rollback to Prior Commit Revision">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setRollbackModalApp(app);
                                  setSelectedRollbackSha(app.syncHistory[1]?.commitSha || app.syncHistory[0]?.commitSha || '');
                                }}
                                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                              >
                                <HistoryRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete Application">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteApp(app.id, app.name)}
                                sx={{ border: '1px solid', borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 1.5 }}
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* TAB 2: GIT REPOSITORIES */}
      {activeTab === 'repos' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <GitHubIcon sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    https://github.com/nextkube/gitops-deployments.git
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Default Primary Git Source • Webhook Push-Sync Enabled
                  </Typography>
                </Box>
              </Box>
              <Chip label="Connected (Ready)" color="success" size="small" sx={{ fontWeight: 700 }} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>DEFAULT BRANCH</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>refs/heads/main</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>AUTH TYPE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>HTTPS Token (Kubernetes Secret)</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>WEBHOOK RECONCILIATION URL</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.78rem' }}>/api/clusters/{clusterId}/gitops/webhook</Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

      {/* TAB 3: RECONCILIATION & ROLLBACK HISTORY */}
      {activeTab === 'history' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Application</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Commit SHA</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Commit Message</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Operator / Author</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sync Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apps.flatMap((app) =>
                  (app.syncHistory || []).map((h) => (
                    <TableRow key={`${app.id}-${h.id}`} hover>
                      <TableCell sx={{ fontWeight: 750, color: 'primary.main' }}>{app.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{h.commitSha}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{h.commitMessage}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{h.author}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{new Date(h.syncedAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{h.duration}</TableCell>
                      <TableCell>
                        <Chip label={h.status} size="small" color={h.status === 'SUCCESS' ? 'success' : 'error'} sx={{ fontWeight: 800, fontSize: '0.65rem', borderRadius: 1 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={() => {
                            setRollbackModalApp(app);
                            setSelectedRollbackSha(h.commitSha);
                          }}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.72rem', py: 0.2 }}
                        >
                          Rollback Here
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* CREATE NEW GITOPS APP MODAL */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              bgcolor: isDark ? '#0f1422' : '#ffffff',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Create GitOps Application</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Application Name"
            size="small"
            fullWidth
            value={newAppName}
            onChange={(e) => setNewAppName(e.target.value)}
            placeholder="e.g. backend-api"
          />

          <TextField
            label="Git Repository URL"
            size="small"
            fullWidth
            value={newRepoUrl}
            onChange={(e) => setNewRepoUrl(e.target.value)}
            placeholder="https://github.com/my-org/manifests.git"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Target Revision / Branch"
              size="small"
              fullWidth
              value={newTargetRevision}
              onChange={(e) => setNewTargetRevision(e.target.value)}
              placeholder="main"
            />
            <TextField
              label="Path in Repository"
              size="small"
              fullWidth
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="manifests/production"
            />
          </Box>

          <FormControl size="small" fullWidth>
            <InputLabel id="ns-label">Destination Namespace</InputLabel>
            <Select
              labelId="ns-label"
              value={newNamespace}
              label="Destination Namespace"
              onChange={(e) => setNewNamespace(e.target.value)}
            >
              {(namespaces || ['default']).map((ns) => (
                <MenuItem key={ns} value={ns}>{ns}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ p: 2, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 1 }}>
              Sync Policies & Automation
            </Typography>
            <FormControlLabel
              control={<Switch checked={newAutoSync} onChange={(e) => setNewAutoSync(e.target.checked)} color="primary" />}
              label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Enable Automated Sync (Reconcile on Git commit push)</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={newSelfHeal} onChange={(e) => setNewSelfHeal(e.target.checked)} color="primary" />}
              label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Self-Healing (Automatically correct manual cluster drift)</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={newAutoPrune} onChange={(e) => setNewAutoPrune(e.target.checked)} color="warning" />}
              label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Auto-Prune (Delete cluster resources removed from Git)</Typography>}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateApp}
            disabled={createLoading || !newAppName.trim() || !newRepoUrl.trim()}
            sx={{ fontWeight: 700 }}
          >
            {createLoading ? <CircularProgress size={20} color="inherit" /> : 'Register Application'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* LIVE VS GIT DIFF MODAL */}
      <Dialog
        open={Boolean(diffModalApp)}
        onClose={() => setDiffModalApp(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              bgcolor: isDark ? '#0f1422' : '#ffffff',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CompareArrowsRoundedIcon sx={{ color: '#a855f7' }} />
          GitOps Declarative Diff: {diffModalApp?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Comparing live cluster state in <b>{diffModalApp?.destinationNamespace}</b> with Git repository branch <b>{diffModalApp?.targetRevision}</b> (commit {diffModalApp?.lastSyncedCommit.sha}).
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              fontFamily: 'monospace',
              fontSize: '0.78rem',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>
                LIVE CLUSTER STATE
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mt: 0.5,
                  borderRadius: 2,
                  bgcolor: isDark ? '#090d16' : '#f1f5f9',
                  maxHeight: 340,
                  overflowY: 'auto',
                }}
              >
                <pre style={{ margin: 0 }}>
{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${diffModalApp?.name || 'app'}
  namespace: ${diffModalApp?.destinationNamespace || 'default'}
spec:
  replicas: ${diffModalApp?.syncStatus === 'Synced' ? 3 : 2}
  template:
    spec:
      containers:
      - name: ${diffModalApp?.name || 'app'}
        image: nginx:1.24.0`}
                </pre>
              </Paper>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                GIT TARGET STATE ({diffModalApp?.targetRevision})
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mt: 0.5,
                  borderRadius: 2,
                  bgcolor: isDark ? '#090d16' : '#f1f5f9',
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  maxHeight: 340,
                  overflowY: 'auto',
                }}
              >
                <pre style={{ margin: 0, color: '#10b981' }}>
{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${diffModalApp?.name || 'app'}
  namespace: ${diffModalApp?.destinationNamespace || 'default'}
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: ${diffModalApp?.name || 'app'}
        image: nginx:1.25.4`}
                </pre>
              </Paper>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setDiffModalApp(null)} sx={{ fontWeight: 700 }}>
            Close
          </Button>
          {diffModalApp && diffModalApp.syncStatus !== 'Synced' && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                handleSyncNow(diffModalApp.id);
                setDiffModalApp(null);
              }}
              sx={{ fontWeight: 700 }}
            >
              Reconcile & Apply Git Target
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ROLLBACK CONFIRMATION MODAL */}
      <Dialog
        open={Boolean(rollbackModalApp)}
        onClose={() => setRollbackModalApp(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              bgcolor: isDark ? '#0f1422' : '#ffffff',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
          <HistoryRoundedIcon />
          Rollback GitOps Application
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Rollback <b>{rollbackModalApp?.name}</b> to a previous Git commit revision:
          </Typography>

          <FormControl size="small" fullWidth>
            <InputLabel id="rollback-label">Target Commit Revision</InputLabel>
            <Select
              labelId="rollback-label"
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
          <Button onClick={() => setRollbackModalApp(null)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleExecuteRollback}
            disabled={rollbackLoading || !selectedRollbackSha}
            sx={{ fontWeight: 700 }}
          >
            {rollbackLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Rollback'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
