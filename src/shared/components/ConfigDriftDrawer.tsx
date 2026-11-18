'use client';

import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Card,
  CardContent,
  CardActions,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
  useTheme,
  Collapse,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import AutoModeRoundedIcon from '@mui/icons-material/AutoModeRounded';
import { useConfigDrift, syncDriftedWorkload } from '../api/dashboard.api';
import { ConfigDriftItem } from '../types/dashboard.types';

export interface ConfigDriftDrawerProps {
  open: boolean;
  onClose: () => void;
  clusterId: string;
  namespace?: string;
  onOpenDiff?: (item: ConfigDriftItem) => void;
}

export default function ConfigDriftDrawer({
  open,
  onClose,
  clusterId,
  namespace = 'default',
  onOpenDiff,
}: ConfigDriftDrawerProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [statusFilter, setStatusFilter] = useState<'all' | 'drifted' | 'synchronized'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [expandedPods, setExpandedPods] = useState<Record<string, boolean>>({});

  const {
    data: driftData,
    isLoading,
    refetch,
    isRefetching,
  } = useConfigDrift(clusterId, namespace, { enabled: open });

  const toggleExpandPods = (id: string) => {
    setExpandedPods((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSyncWorkload = async (item: ConfigDriftItem) => {
    setSyncingId(item.id);
    setSyncSuccessMsg(null);
    try {
      const res = await syncDriftedWorkload(
        clusterId,
        item.workloadName,
        item.workloadKind,
        item.namespace
      );
      setSyncSuccessMsg(res.message || `Rolling restart initiated for ${item.workloadName}.`);
      await refetch();
    } catch (err: any) {
      console.error('Failed to sync drifted workload:', err);
      setSyncSuccessMsg(`Failed to sync: ${err?.message || 'Cluster error'}`);
    } finally {
      setSyncingId(null);
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    }
  };

  const filteredItems = useMemo(() => {
    if (!driftData?.items) return [];

    return driftData.items.filter((item) => {
      // Status filter
      if (statusFilter === 'drifted' && item.driftStatus !== 'DRIFTED') return false;
      if (statusFilter === 'synchronized' && item.driftStatus !== 'SYNCHRONIZED') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesWorkload = item.workloadName.toLowerCase().includes(q);
        const matchesConfig = item.configName.toLowerCase().includes(q);
        const matchesKey = item.referencedKeys.some((k) => k.toLowerCase().includes(q));
        if (!matchesWorkload && !matchesConfig && !matchesKey) return false;
      }

      return true;
    });
  }, [driftData, statusFilter, searchQuery]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: '580px', md: '640px' },
            bgcolor: isDark ? '#080c14' : '#ffffff',
            backgroundImage: 'none',
            borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          bgcolor: isDark ? '#0f1422' : '#f8fafc',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2.5,
              bgcolor: isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(217, 119, 6, 0.12)',
              color: isDark ? '#fbbf24' : '#d97706',
            }}
          >
            <AutoModeRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              ConfigMap & Secret Drift Detector
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Detects pods running stale configurations after ConfigMap/Secret updates
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh Drift Analysis">
            <IconButton size="small" onClick={() => refetch()} disabled={isLoading || isRefetching}>
              <RefreshRoundedIcon
                fontSize="small"
                sx={{
                  animation: isLoading || isRefetching ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
                }}
              />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* KPI Summary Cards */}
      <Box
        sx={{
          p: 2,
          px: 2.5,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1.5,
          bgcolor: isDark ? '#0b101c' : '#f1f5f9',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: isDark ? '#111728' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
            Monitored
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25 }}>
            {driftData?.totalWorkloads ?? 0}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`,
          }}
        >
          <Typography variant="caption" sx={{ color: isDark ? '#fbbf24' : '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>
            Drifted / Stale
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#fbbf24' : '#d97706', mt: 0.25 }}>
            {driftData?.driftedWorkloads ?? 0}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.1)',
            border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(22, 163, 74, 0.25)'}`,
          }}
        >
          <Typography variant="caption" sx={{ color: isDark ? '#4ade80' : '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>
            Synchronized
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#4ade80' : '#16a34a', mt: 0.25 }}>
            {driftData?.synchronizedWorkloads ?? 0}
          </Typography>
        </Box>
      </Box>

      {/* Filter and Search Bar */}
      <Box
        sx={{
          p: 2,
          px: 2.5,
          display: 'flex',
          gap: 1.5,
          alignItems: 'center',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <TextField
          size="small"
          placeholder="Filter by workload, ConfigMap, or key..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { height: 34, fontSize: '0.82rem' } }}
        />

        <ToggleButtonGroup
          size="small"
          value={statusFilter}
          exclusive
          onChange={(_, val) => val && setStatusFilter(val)}
          sx={{ height: 34 }}
        >
          <ToggleButton value="all" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 700, textTransform: 'none' }}>
            All
          </ToggleButton>
          <ToggleButton value="drifted" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 700, textTransform: 'none' }}>
            Drifted
          </ToggleButton>
          <ToggleButton value="synchronized" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 700, textTransform: 'none' }}>
            Synced
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Sync Status Banner */}
      {syncSuccessMsg && (
        <Alert severity="info" sx={{ mx: 2.5, mt: 2, py: 0.5, fontSize: '0.8rem', fontWeight: 600 }}>
          {syncSuccessMsg}
        </Alert>
      )}

      {/* Workload Drift Cards List */}
      <Box sx={{ p: 2.5, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress size={32} />
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 2 }}>
              Scanning namespace workloads and mounted configurations...
            </Typography>
          </Box>
        ) : filteredItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CheckCircleRoundedIcon sx={{ fontSize: 44, color: 'success.main', mb: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              No Drift Detected
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              All running pods are synchronized with their referenced ConfigMaps and Secrets.
            </Typography>
          </Box>
        ) : (
          filteredItems.map((item) => {
            const isDrifted = item.driftStatus === 'DRIFTED';
            const isSyncing = syncingId === item.id;
            const isExpanded = !!expandedPods[item.id];

            return (
              <Card
                key={item.id}
                variant="outlined"
                sx={{
                  bgcolor: isDark ? '#0d1322' : '#ffffff',
                  borderColor: isDrifted
                    ? isDark
                      ? 'rgba(245, 158, 11, 0.35)'
                      : 'rgba(217, 119, 6, 0.4)'
                    : isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.08)',
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: isDrifted ? '#f59e0b' : 'primary.main',
                  },
                }}
              >
                <CardContent sx={{ p: 2, pb: 1.5 }}>
                  {/* Top row: Workload & Status Chip */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          bgcolor: item.configType === 'ConfigMap' ? 'info.dark' : 'secondary.dark',
                          color: '#ffffff',
                          opacity: 0.9,
                        }}
                      >
                        {item.configType === 'ConfigMap' ? (
                          <DescriptionRoundedIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <VpnKeyRoundedIcon sx={{ fontSize: 18 }} />
                        )}
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {item.workloadName}
                          </Typography>
                          <Chip
                            label={item.workloadKind}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Mounts {item.configType}: <b>{item.configName}</b>
                        </Typography>
                      </Box>
                    </Box>

                    <Chip
                      icon={
                        isDrifted ? (
                          <WarningAmberRoundedIcon sx={{ fontSize: '14px !important' }} />
                        ) : (
                          <CheckCircleRoundedIcon sx={{ fontSize: '14px !important' }} />
                        )
                      }
                      label={isDrifted ? `DRIFTED (${item.stalePodCount} Stale)` : 'SYNCHRONIZED'}
                      size="small"
                      color={isDrifted ? 'warning' : 'success'}
                      sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22 }}
                    />
                  </Box>

                  {/* Explanation Alert */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.78rem',
                      color: isDrifted ? (isDark ? '#fed7aa' : '#9a3412') : 'text.secondary',
                      bgcolor: isDrifted
                        ? isDark
                          ? 'rgba(245, 158, 11, 0.08)'
                          : 'rgba(254, 215, 170, 0.25)'
                        : 'transparent',
                      p: isDrifted ? 1 : 0,
                      borderRadius: 1.5,
                      my: 1,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.explanation}
                  </Typography>

                  {/* Referenced Keys Badges */}
                  {item.referencedKeys.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', alignSelf: 'center' }}>
                        Referenced keys:
                      </Typography>
                      {item.referencedKeys.map((k) => (
                        <Chip
                          key={k}
                          label={k}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem', fontFamily: 'monospace' }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Stale Pods Expandable Section */}
                  {isDrifted && item.stalePods.length > 0 && (
                    <Box sx={{ mt: 1.5 }}>
                      <Button
                        size="small"
                        onClick={() => toggleExpandPods(item.id)}
                        endIcon={isExpanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                        sx={{
                          p: 0,
                          fontSize: '0.72rem',
                          textTransform: 'none',
                          color: 'text.secondary',
                          fontWeight: 600,
                        }}
                      >
                        {isExpanded ? 'Hide Stale Pods' : `Show ${item.stalePods.length} Stale Pod(s)`}
                      </Button>
                      <Collapse in={isExpanded}>
                        <Box
                          sx={{
                            mt: 1,
                            p: 1,
                            bgcolor: isDark ? '#070a12' : '#f1f5f9',
                            borderRadius: 1.5,
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                          }}
                        >
                          {item.stalePods.map((pod) => (
                            <Typography
                              key={pod}
                              variant="caption"
                              sx={{
                                display: 'block',
                                fontFamily: 'monospace',
                                color: isDark ? '#f87171' : '#dc2626',
                                fontSize: '0.72rem',
                                py: 0.25,
                              }}
                            >
                              • {pod}
                            </Typography>
                          ))}
                        </Box>
                      </Collapse>
                    </Box>
                  )}
                </CardContent>

                <Divider sx={{ opacity: 0.6 }} />

                {/* Actions Bar */}
                <CardActions sx={{ px: 2, py: 1, justifyContent: 'space-between' }}>
                  {onOpenDiff && (
                    <Button
                      size="small"
                      startIcon={<CodeRoundedIcon fontSize="small" />}
                      onClick={() => onOpenDiff(item)}
                      sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                    >
                      View Manifest
                    </Button>
                  )}

                  {isDrifted && (
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      disabled={isSyncing}
                      onClick={() => handleSyncWorkload(item)}
                      startIcon={
                        isSyncing ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <SyncRoundedIcon fontSize="small" />
                        )
                      }
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', px: 1.5 }}
                    >
                      {isSyncing ? 'Restarting Pods...' : '1-Click Sync (Rolling Restart)'}
                    </Button>
                  )}
                </CardActions>
              </Card>
            );
          })
        )}
      </Box>
    </Drawer>
  );
}
