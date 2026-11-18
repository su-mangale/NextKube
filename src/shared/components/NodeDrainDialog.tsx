'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  useTheme,
  Collapse,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CleaningServicesRoundedIcon from '@mui/icons-material/CleaningServicesRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import {
  fetchNodeDrainPreview,
  drainNode,
  cordonNode,
} from '../api/dashboard.api';
import {
  NodeDrainPreview,
  NodeDrainProgressItem,
  NodeDrainResult,
} from '../types/dashboard.types';

export interface NodeDrainDialogProps {
  open: boolean;
  onClose: () => void;
  clusterId: string;
  nodeName: string;
  isCordoned?: boolean;
  onSuccess?: () => void;
}

export default function NodeDrainDialog({
  open,
  onClose,
  clusterId,
  nodeName,
  isCordoned = false,
  onSuccess,
}: NodeDrainDialogProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [loadingPreview, setLoadingPreview] = useState<boolean>(true);
  const [preview, setPreview] = useState<NodeDrainPreview | null>(null);

  // Configuration options
  const [ignoreDaemonSets, setIgnoreDaemonSets] = useState<boolean>(true);
  const [deleteEmptyDirData, setDeleteEmptyDirData] = useState<boolean>(true);
  const [force, setForce] = useState<boolean>(false);
  const [gracePeriod, setGracePeriod] = useState<number>(30);

  // Execution state
  const [draining, setDraining] = useState<boolean>(false);
  const [drainLogs, setDrainLogs] = useState<NodeDrainProgressItem[]>([]);
  const [drainResult, setDrainResult] = useState<NodeDrainResult | null>(null);
  const [expandedPodList, setExpandedPodList] = useState<boolean>(false);

  // Uncordon state after drain
  const [uncordoning, setUncordoning] = useState<boolean>(false);
  const [uncordonedSuccess, setUncordonedSuccess] = useState<boolean>(false);

  // Load preview whenever dialog opens
  useEffect(() => {
    if (open && nodeName && clusterId) {
      setLoadingPreview(true);
      setDrainResult(null);
      setDrainLogs([]);
      setUncordonedSuccess(false);

      fetchNodeDrainPreview(clusterId, nodeName)
        .then((data) => {
          setPreview(data);
          setLoadingPreview(false);
        })
        .catch((err) => {
          console.error('Failed to load drain preview:', err);
          setLoadingPreview(false);
        });
    }
  }, [open, nodeName, clusterId]);

  const handleStartDrain = async () => {
    setDraining(true);
    setDrainLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        status: 'cordoned',
        message: `Initiating zero-downtime drain for node '${nodeName}'...`,
      },
    ]);

    try {
      const res = await drainNode(clusterId, {
        nodeName,
        ignoreDaemonSets,
        deleteEmptyDirData,
        force,
        gracePeriodSeconds: gracePeriod,
      });

      setDrainLogs(res.logs);
      setDrainResult(res);
      onSuccess?.();
    } catch (err: any) {
      const failedItem: NodeDrainProgressItem = {
        timestamp: new Date().toLocaleTimeString(),
        status: 'failed',
        message: `Drain failed: ${err?.message || 'Cluster error'}`,
      };
      setDrainLogs((prev) => [...prev, failedItem]);
      setDrainResult({
        success: false,
        message: err?.message || 'Failed to drain node.',
        totalPods: preview?.totalPods || 0,
        evictedPods: 0,
        skippedPods: 0,
        failedPods: 1,
        logs: [...drainLogs, failedItem],
      });
    } finally {
      setDraining(false);
    }
  };

  const handleUncordon = async () => {
    setUncordoning(true);
    try {
      await cordonNode(clusterId, nodeName, false);
      setUncordonedSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to uncordon node:', err);
    } finally {
      setUncordoning(false);
    }
  };

  const totalPods = preview?.totalPods || 0;
  const evictableCount = preview?.evictablePods.length || 0;
  const daemonSetCount = preview?.daemonSetPods.length || 0;
  const emptyDirCount = preview?.emptyDirPods.length || 0;

  return (
    <Dialog
      open={open}
      onClose={() => !draining && onClose()}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: isDark ? '#0b101c' : '#ffffff',
            backgroundImage: 'none',
            borderRadius: 3,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: isDark
              ? '0 24px 48px -12px rgba(0,0,0,0.85)'
              : '0 20px 40px -10px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
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
              bgcolor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.1)',
              color: isDark ? '#f87171' : '#dc2626',
            }}
          >
            <CleaningServicesRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Zero-Downtime Node Drain: {nodeName}
              </Typography>
              <Chip
                label={isCordoned || preview?.isCordoned ? 'Cordoned' : 'Schedulable'}
                size="small"
                color={isCordoned || preview?.isCordoned ? 'warning' : 'success'}
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Safely cordons node and gracefully evicts replicated workloads to other nodes
            </Typography>
          </Box>
        </Box>

        <IconButton size="small" onClick={onClose} disabled={draining}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {loadingPreview ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 2 }}>
              Analyzing node pods, DaemonSets, and storage volumes...
            </Typography>
          </Box>
        ) : drainResult ? (
          // Completion Result View
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert
              severity={drainResult.success ? 'success' : 'error'}
              icon={
                drainResult.success ? (
                  <CheckCircleRoundedIcon fontSize="inherit" />
                ) : (
                  <ErrorOutlineRoundedIcon fontSize="inherit" />
                )
              }
              sx={{ fontWeight: 600, fontSize: '0.85rem' }}
            >
              {drainResult.message}
            </Alert>

            {drainResult.success && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.1)',
                  border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(22, 163, 74, 0.25)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Node Ready for Host Maintenance / Reboot
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    All replicated pods were relocated. Remember to uncordon this node once maintenance is complete.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  disabled={uncordoning || uncordonedSuccess}
                  onClick={handleUncordon}
                  startIcon={
                    uncordoning ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <LockOpenRoundedIcon fontSize="small" />
                    )
                  }
                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem' }}
                >
                  {uncordonedSuccess ? 'Uncordoned!' : 'Uncordon Node Now'}
                </Button>
              </Box>
            )}

            {/* Execution Logs Terminal View */}
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
              Eviction Execution Log:
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isDark ? '#050811' : '#1e293b',
                color: '#f8fafc',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                maxHeight: 220,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
              }}
            >
              {drainLogs.map((log, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1 }}>
                  <Typography component="span" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                    [{log.timestamp}]
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.75rem',
                      color:
                        log.status === 'failed'
                          ? '#f87171'
                          : log.status === 'evicted' || log.status === 'completed'
                          ? '#4ade80'
                          : log.status === 'skipped'
                          ? '#fbbf24'
                          : '#e2e8f0',
                    }}
                  >
                    {log.message}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : draining ? (
          // In-Progress Draining View
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={24} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Draining node {nodeName}... Pods are being gracefully relocated.
              </Typography>
            </Box>
            <LinearProgress sx={{ borderRadius: 1, height: 6 }} />

            {/* Live streaming logs */}
            <Box
              sx={{
                p: 2,
                mt: 1,
                borderRadius: 2,
                bgcolor: isDark ? '#050811' : '#1e293b',
                color: '#f8fafc',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                height: 180,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
              }}
            >
              {drainLogs.map((log, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1 }}>
                  <Typography component="span" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                    [{log.timestamp}]
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.75rem',
                      color:
                        log.status === 'failed'
                          ? '#f87171'
                          : log.status === 'evicted'
                          ? '#4ade80'
                          : '#e2e8f0',
                    }}
                  >
                    {log.message}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          // Pre-Drain Inspection View
          <>
            {/* KPI Cards Row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: isDark ? '#111728' : '#f8fafc',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Pods
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25 }}>
                  {totalPods}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.08)',
                  border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.25)'}`,
                }}
              >
                <Typography variant="caption" sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 700, textTransform: 'uppercase' }}>
                  To Evict
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#38bdf8' : '#0284c7', mt: 0.25 }}>
                  {evictableCount}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(168, 85, 247, 0.08)' : 'rgba(147, 51, 234, 0.08)',
                  border: `1px solid ${isDark ? 'rgba(168, 85, 247, 0.25)' : 'rgba(147, 51, 234, 0.25)'}`,
                }}
              >
                <Typography variant="caption" sx={{ color: isDark ? '#c084fc' : '#9333ea', fontWeight: 700, textTransform: 'uppercase' }}>
                  DaemonSets
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#c084fc' : '#9333ea', mt: 0.25 }}>
                  {daemonSetCount}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: emptyDirCount > 0
                    ? isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(217, 119, 6, 0.08)'
                    : isDark ? '#111728' : '#f8fafc',
                  border: `1px solid ${
                    emptyDirCount > 0
                      ? isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(217, 119, 6, 0.25)'
                      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
                  }`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: emptyDirCount > 0 ? (isDark ? '#fbbf24' : '#d97706') : 'text.secondary',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  emptyDir
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: emptyDirCount > 0 ? (isDark ? '#fbbf24' : '#d97706') : 'inherit',
                    mt: 0.25,
                  }}
                >
                  {emptyDirCount}
                </Typography>
              </Box>
            </Box>

            {/* Eviction Pods List Collapse */}
            <Box
              sx={{
                borderRadius: 2,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
                overflow: 'hidden',
              }}
            >
              <Box
                onClick={() => setExpandedPodList(!expandedPodList)}
                sx={{
                  p: 1.5,
                  bgcolor: isDark ? '#0f1422' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DnsRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Inspect Target Pods on Node ({totalPods})
                  </Typography>
                </Box>
                {expandedPodList ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
              </Box>
              <Collapse in={expandedPodList}>
                <Box sx={{ p: 1.5, maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {preview?.evictablePods.map((p) => (
                    <Box
                      key={`${p.namespace}-${p.name}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 0.75,
                        borderRadius: 1,
                        bgcolor: isDark ? '#070a12' : '#ffffff',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={p.namespace} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {p.name}
                        </Typography>
                      </Box>
                      <Chip label={`Evict (${p.kind})`} size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
                    </Box>
                  ))}
                  {preview?.daemonSetPods.map((p) => (
                    <Box
                      key={`${p.namespace}-${p.name}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 0.75,
                        borderRadius: 1,
                        bgcolor: isDark ? '#070a12' : '#ffffff',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={p.namespace} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary' }}>
                          {p.name}
                        </Typography>
                      </Box>
                      <Chip label="Retain (DaemonSet)" size="small" color="default" sx={{ height: 18, fontSize: '0.62rem' }} />
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </Box>

            {/* Drain Safety Options */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                Drain Safety & Policy Controls:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={ignoreDaemonSets}
                      onChange={(e) => setIgnoreDaemonSets(e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Ignore DaemonSet pods (--ignore-daemonsets)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Leave node-level agents (Cilium, Kube-Proxy, loggers) running during host maintenance
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={deleteEmptyDirData}
                      onChange={(e) => setDeleteEmptyDirData(e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Delete emptyDir data (--delete-emptydir-data)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Permits eviction of pods using temporary local disk storage volumes
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={force}
                      onChange={(e) => setForce(e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Force evict unmanaged standalone pods (--force)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Allow eviction of naked pods not managed by a Deployment, Job, or ReplicaSet
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <TextField
                  size="small"
                  label="Grace Period (seconds)"
                  type="number"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value) || 0)}
                  slotProps={{ htmlInput: { min: 0, max: 300 } }}
                  sx={{ width: 200, '& .MuiOutlinedInput-root': { height: 38 } }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 360 }}>
                  Time pods are granted to finish in-flight requests and cleanly shut down before SIGKILL.
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <Divider sx={{ opacity: 0.6 }} />

      {/* Footer */}
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={draining} sx={{ fontWeight: 700, color: 'text.secondary' }}>
          {drainResult ? 'Close' : 'Cancel'}
        </Button>

        {!drainResult && (
          <Button
            variant="contained"
            color="error"
            disabled={draining || loadingPreview}
            onClick={handleStartDrain}
            startIcon={
              draining ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <CleaningServicesRoundedIcon fontSize="small" />
              )
            }
            sx={{ fontWeight: 700, textTransform: 'none', px: 2.5 }}
          >
            {draining ? 'Draining Node...' : `Drain Node (${evictableCount} Pods)`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
