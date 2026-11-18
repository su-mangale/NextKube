'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Card,
  TextField,
  FormControlLabel,
  Switch,
  LinearProgress,
  Alert,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
  useTheme,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DynamicFeedRoundedIcon from '@mui/icons-material/DynamicFeedRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import {
  fetchNamespaceClonePreview,
  cloneNamespace,
} from '../api/dashboard.api';
import {
  NamespaceClonePreview,
  NamespaceCloneResult,
} from '../types/dashboard.types';
import { copyToClipboard } from '../utils/clipboard';
import { DraggablePaper } from './DraggablePaper';

export interface NamespaceClonerDialogProps {
  open: boolean;
  onClose: () => void;
  clusterId: string;
  namespaces?: string[];
  initialSourceNamespace?: string;
  onSuccess?: (targetNamespace: string) => void;
}

const ALL_RESOURCE_TYPES = [
  'Deployments',
  'Services',
  'ConfigMaps',
  'Secrets',
  'StatefulSets',
  'DaemonSets',
  'Ingresses',
  'PersistentVolumeClaims',
  'CronJobs',
];

export default function NamespaceClonerDialog({
  open,
  onClose,
  clusterId,
  namespaces = ['default', 'production', 'kube-system'],
  initialSourceNamespace = 'default',
  onSuccess,
}: NamespaceClonerDialogProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [activeTab, setActiveTab] = useState<number>(0);
  const [sourceNamespace, setSourceNamespace] = useState<string>(initialSourceNamespace);
  const [targetNamespace, setTargetNamespace] = useState<string>(`${initialSourceNamespace}-clone`);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(ALL_RESOURCE_TYPES);
  const [includeSecrets, setIncludeSecrets] = useState<boolean>(true);
  const [includePVCs, setIncludePVCs] = useState<boolean>(true);
  const [createTargetNamespace, setCreateTargetNamespace] = useState<boolean>(true);

  // Preview & execution state
  const [preview, setPreview] = useState<NamespaceClonePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [cloning, setCloning] = useState<boolean>(false);
  const [result, setResult] = useState<NamespaceCloneResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync initialSourceNamespace
  useEffect(() => {
    if (initialSourceNamespace) {
      setSourceNamespace(initialSourceNamespace);
      setTargetNamespace(`${initialSourceNamespace}-clone`);
    }
  }, [initialSourceNamespace]);

  // Load preview when source namespace changes
  const loadPreview = useCallback(async (ns: string) => {
    if (!clusterId || !ns) return;
    setLoadingPreview(true);
    setResult(null);
    try {
      const data = await fetchNamespaceClonePreview(clusterId, ns);
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [clusterId]);

  useEffect(() => {
    if (open && sourceNamespace) {
      loadPreview(sourceNamespace);
    }
  }, [open, sourceNamespace, loadPreview]);

  // Handle clone execution
  const handleExecuteClone = async () => {
    if (!targetNamespace.trim() || targetNamespace === sourceNamespace) return;
    setCloning(true);
    setResult(null);
    try {
      const res = await cloneNamespace(clusterId, {
        sourceNamespace,
        targetNamespace: targetNamespace.trim().toLowerCase(),
        resourceTypes: selectedTypes,
        includeSecrets,
        includePVCs,
        createTargetNamespace,
      });
      setResult(res);
      if (res.success) {
        onSuccess?.(targetNamespace.trim().toLowerCase());
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.message || 'Error occurred while cloning namespace',
        sourceNamespace,
        targetNamespace,
        totalCreated: 0,
        totalSkipped: 0,
        totalFailed: 1,
        logs: [
          {
            timestamp: new Date().toLocaleTimeString(),
            resourceType: 'Error',
            resourceName: targetNamespace,
            status: 'failed',
            message: err?.message || 'Failed to clone namespace',
          },
        ],
      });
    } finally {
      setCloning(false);
    }
  };

  // Toggle resource type
  const handleToggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Copy YAML
  const handleCopyYaml = async () => {
    if (!preview?.sanitizedYamlPreview) return;
    await copyToClipboard(preview.sanitizedYamlPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download YAML
  const handleDownloadYaml = () => {
    if (!preview?.sanitizedYamlPreview) return;
    const blob = new Blob([preview.sanitizedYamlPreview], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sourceNamespace}-sanitized-bundle.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onClose={cloning ? undefined : onClose}
      PaperComponent={DraggablePaper}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(0,0,0,0.45)',
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
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
            }}
          >
            <DynamicFeedRoundedIcon />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              1-Click Namespace Cloner & Multi-Document YAML Exporter
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Ephemeral staging duplication · Automated metadata sanitization & GitOps export
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh Source Inspection">
            <IconButton size="small" onClick={() => loadPreview(sourceNamespace)} disabled={loadingPreview}>
              <RefreshRoundedIcon
                fontSize="small"
                sx={{
                  animation: loadingPreview ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                }}
              />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} disabled={cloning}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Progress Bar */}
      {(loadingPreview || cloning) && <LinearProgress color="info" sx={{ height: 2 }} />}

      <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Source and Target Namespace Selection */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Source Namespace</InputLabel>
            <Select
              value={sourceNamespace}
              label="Source Namespace"
              disabled={cloning}
              onChange={(e) => {
                const ns = e.target.value;
                setSourceNamespace(ns);
                setTargetNamespace(`${ns}-clone`);
              }}
            >
              {namespaces.map((ns) => (
                <MenuItem key={ns} value={ns}>{ns}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            fullWidth
            label="Target Namespace Name"
            value={targetNamespace}
            disabled={cloning}
            onChange={(e) => setTargetNamespace(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            helperText="Auto-slugified for Kubernetes DNS RFC 1123 compliance"
          />
        </Box>

        {/* Safety Switches */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={createTargetNamespace}
                onChange={(e) => setCreateTargetNamespace(e.target.checked)}
                disabled={cloning}
              />
            }
            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Create Target Namespace</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={includeSecrets}
                onChange={(e) => setIncludeSecrets(e.target.checked)}
                disabled={cloning}
              />
            }
            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Include Secrets</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={includePVCs}
                onChange={(e) => setIncludePVCs(e.target.checked)}
                disabled={cloning}
              />
            }
            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Include PVCs</Typography>}
          />
        </Box>

        {/* Resource Selector Chips & Checkboxes */}
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
              Select Resources to Clone ({selectedTypes.length} / {ALL_RESOURCE_TYPES.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={() => setSelectedTypes(ALL_RESOURCE_TYPES)}
                sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0 }}
              >
                Select All
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedTypes([])}
                sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0 }}
              >
                Clear
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {ALL_RESOURCE_TYPES.map((type) => {
              const count = preview?.resourceCounts?.[type] || 0;
              const isSelected = selectedTypes.includes(type);
              return (
                <Chip
                  key={type}
                  label={`${type} (${count})`}
                  size="small"
                  onClick={() => handleToggleType(type)}
                  color={isSelected ? 'primary' : 'default'}
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    opacity: count === 0 && !isSelected ? 0.6 : 1,
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Tabs: Clone Logs vs Sanitized Multi-Document YAML */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
            <Tab
              icon={<PlayArrowRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="Cloning Pipeline"
              sx={{ fontWeight: 700, textTransform: 'none' }}
            />
            <Tab
              icon={<CodeRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="Sanitized Multi-Doc YAML Preview"
              sx={{ fontWeight: 700, textTransform: 'none' }}
            />
          </Tabs>
        </Box>

        {/* TAB 0: Cloning Pipeline & Execution Logs */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Feedback Alert */}
            {result && (
              <Alert
                severity={result.success ? 'success' : 'error'}
                icon={result.success ? <CheckCircleRoundedIcon fontSize="inherit" /> : undefined}
                sx={{ borderRadius: 2 }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {result.message}
                </Typography>
                <Typography variant="caption">
                  {result.totalCreated} resources provisioned into namespace &apos;{result.targetNamespace}&apos;.
                </Typography>
              </Alert>
            )}

            {/* Live Progress Terminal Logs */}
            <Card
              variant="outlined"
              sx={{
                bgcolor: isDark ? '#020617' : '#0f172a',
                color: '#f8fafc',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#94a3b8', fontWeight: 700 }}>
                  CLONING EXECUTION LOGS
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b' }}>
                  {result?.logs.length || 0} events
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  maxHeight: 220,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                {!result?.logs || result.logs.length === 0 ? (
                  <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                    Ready to clone. Click &apos;Clone Namespace Now&apos; to begin execution.
                  </Typography>
                ) : (
                  result.logs.map((log, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Typography component="span" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                        [{log.timestamp}]
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          color: log.status === 'created' ? '#4ade80' : log.status === 'failed' ? '#f87171' : '#38bdf8',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                        }}
                      >
                        [{log.resourceType}]
                      </Typography>
                      <Typography component="span" sx={{ color: '#e2e8f0', fontSize: '0.72rem' }}>
                        {log.message}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </Card>
          </Box>
        )}

        {/* TAB 1: Sanitized Multi-Document YAML Preview */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Stripped transient metadata (uid, resourceVersion, status, clusterIPs, PVC volume bindings).
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleCopyYaml}
                  startIcon={copied ? <CheckCircleRoundedIcon color="success" /> : <ContentCopyRoundedIcon />}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  {copied ? 'Copied!' : 'Copy YAML'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleDownloadYaml}
                  startIcon={<FileDownloadRoundedIcon />}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Download .yaml
                </Button>
              </Box>
            </Box>

            <Card
              variant="outlined"
              sx={{
                bgcolor: isDark ? '#020617' : '#0f172a',
                color: '#f8fafc',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  maxHeight: 280,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre',
                }}
              >
                {preview?.sanitizedYamlPreview || '# Loading YAML preview...'}
              </Box>
            </Card>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={cloning} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExecuteClone}
          disabled={cloning || !targetNamespace.trim() || targetNamespace === sourceNamespace}
          startIcon={cloning ? <CircularProgress size={16} color="inherit" /> : <PlayArrowRoundedIcon />}
          sx={{ fontWeight: 700, textTransform: 'none', px: 2.5 }}
        >
          {cloning ? 'Cloning Namespace...' : `Clone into '${targetNamespace || 'target'}'`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
