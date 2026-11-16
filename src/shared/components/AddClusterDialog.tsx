'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HubIcon from '@mui/icons-material/Hub';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import jsyaml from 'js-yaml';
import { useQueryClient } from '@tanstack/react-query';
import { AttachedClusterPayload, ClusterConnectionTestResult } from '../types/fleet.types';
import { useCluster } from '../context/cluster-context';

export interface AddClusterDialogProps {
  open: boolean;
  onClose: () => void;
  onClusterAdded?: (clusterId: string) => void;
}

export function AddClusterDialog({ open, onClose, onClusterAdded }: AddClusterDialogProps) {
  const queryClient = useQueryClient();
  const { attachCluster, setActiveClusterId } = useCluster();

  // Cluster metadata
  const [clusterName, setClusterName] = useState('');
  const [provider, setProvider] = useState<'GCP' | 'AWS' | 'Azure' | 'Nutanix' | 'OpenShift' | 'Baremetal' | 'Kind' | 'Minikube' | 'Custom'>('Custom');

  // Kubeconfig states
  const [kubeconfigRaw, setKubeconfigRaw] = useState('');
  const [selectedContext, setSelectedContext] = useState('');
  const [parsedContexts, setParsedContexts] = useState<string[]>([]);
  const [kubeconfigFileName, setKubeconfigFileName] = useState<string | null>(null);

  // Test Connection & Save states
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<ClusterConnectionTestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatically parse Kubeconfig contexts when raw YAML changes
  const handleKubeconfigChange = (yamlText: string) => {
    setKubeconfigRaw(yamlText);
    setTestResult(null);
    setErrorMessage(null);

    if (!yamlText.trim()) {
      setParsedContexts([]);
      setSelectedContext('');
      return;
    }

    try {
      const parsed: any = jsyaml.load(yamlText);
      if (parsed && Array.isArray(parsed.contexts)) {
        const contexts = parsed.contexts.map((c: any) => c.name).filter(Boolean);
        setParsedContexts(contexts);
        const currentContext = parsed['current-context'] || contexts[0] || '';
        setSelectedContext(currentContext);

        // Autofill cluster name from context if empty
        if (!clusterName && currentContext) {
          setClusterName(currentContext.replace(/[^a-zA-Z0-9-_]/g, '-'));
        }
      }
    } catch {
      // Ignore intermediate YAML typing syntax errors
    }
  };

  // Handle drag-and-drop or file upload for Kubeconfig
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setKubeconfigFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleKubeconfigChange(content);
    };
    reader.readAsText(file);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    const payload: Partial<AttachedClusterPayload> = {
      method: 'kubeconfig',
      kubeconfigRaw,
      contextName: selectedContext || undefined,
    };

    try {
      const res = await fetch('/api/clusters/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: ClusterConnectionTestResult = await res.json();
      setTestResult(data);

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Connection check failed. Verify cluster connectivity and credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error executing connection pre-flight check.');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCluster = async () => {
    if (!clusterName.trim()) {
      setErrorMessage('Cluster name is required.');
      return;
    }

    if (!kubeconfigRaw.trim()) {
      setErrorMessage('Kubeconfig YAML file or text is required.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const payload: AttachedClusterPayload = {
      name: clusterName.trim(),
      provider,
      environment: 'production',
      fleetId: 'default',
      method: 'kubeconfig',
      kubeconfigRaw,
      contextName: selectedContext || undefined,
      version: testResult?.version,
      nodeCount: testResult?.nodeCount,
    };

    try {
      // 1. Save to server-side encrypted vault
      const res = await fetch('/api/clusters/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to save cluster to NextKube vault.');
        return;
      }

      // 2. Also register in client-side cluster context for instant UI update
      attachCluster(payload);
      queryClient.invalidateQueries({ queryKey: ['clustersList'] });
      const targetId = data.cluster?.id || clusterName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      setActiveClusterId(targetId);

      if (onClusterAdded) {
        onClusterAdded(targetId);
      }

      // Close dialog
      handleResetAndClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving cluster to vault.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAndClose = () => {
    setClusterName('');
    setKubeconfigRaw('');
    setKubeconfigFileName(null);
    setParsedContexts([]);
    setSelectedContext('');
    setTestResult(null);
    setErrorMessage(null);
    onClose();
  };

  const isFormValid = useMemo(() => {
    return Boolean(clusterName.trim() && kubeconfigRaw.trim());
  }, [clusterName, kubeconfigRaw]);

  return (
    <Dialog
      open={open}
      onClose={handleResetAndClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: '#0f172a',
            backgroundImage: 'linear-gradient(to bottom, #111827, #0b0f19)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            color: '#f8fafc',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HubIcon sx={{ color: '#38bdf8', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#f8fafc' }}>
              Connect Kubernetes Cluster
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              Connect via Kubeconfig file or raw YAML configuration
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleResetAndClose} size="small" sx={{ color: '#94a3b8' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', py: 2 }}>
        {/* Cluster Details */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2, mb: 2.5 }}>
          <TextField
            label="Cluster Display Name"
            placeholder="e.g. My-Production-Cluster"
            size="small"
            required
            value={clusterName}
            onChange={(e) => setClusterName(e.target.value)}
            slotProps={{
              input: {
                sx: { color: '#f8fafc', bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 2 },
              },
            }}
          />

          <FormControl size="small">
            <InputLabel id="provider-select-label" sx={{ color: '#94a3b8' }}>
              Cloud / Distro Provider
            </InputLabel>
            <Select
              labelId="provider-select-label"
              value={provider}
              label="Cloud / Distro Provider"
              onChange={(e) => setProvider(e.target.value as any)}
              sx={{ color: '#f8fafc', bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 2 }}
            >
              <MenuItem value="GCP">Google Kubernetes Engine (GKE)</MenuItem>
              <MenuItem value="AWS">Amazon EKS</MenuItem>
              <MenuItem value="Azure">Azure Kubernetes Service (AKS)</MenuItem>
              <MenuItem value="Kind">KinD (Kubernetes in Docker)</MenuItem>
              <MenuItem value="Minikube">Minikube</MenuItem>
              <MenuItem value="Baremetal">Baremetal / K3s</MenuItem>
              <MenuItem value="OpenShift">Red Hat OpenShift</MenuItem>
              <MenuItem value="Custom">Custom / Other</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Kubeconfig Upload Drop Zone */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            component="label"
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: '1px dashed rgba(56, 189, 248, 0.35)',
              bgcolor: 'rgba(56, 189, 248, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#38bdf8',
                bgcolor: 'rgba(56, 189, 248, 0.08)',
              },
            }}
          >
            <input type="file" accept=".yaml,.yml,.conf" hidden onChange={handleFileUpload} />
            <CloudUploadIcon sx={{ color: '#38bdf8', fontSize: 32, mb: 0.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#f8fafc' }}>
              {kubeconfigFileName ? `Selected: ${kubeconfigFileName}` : 'Drop .kube/config file here, or click to browse'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Supports standard Kubernetes kubeconfig files (.yaml, .yml, .conf)
            </Typography>
          </Box>

          {/* Context Selector if multiple contexts found */}
          {parsedContexts.length > 0 && (
            <FormControl size="small" fullWidth>
              <InputLabel id="context-select-label" sx={{ color: '#94a3b8' }}>
                Target Context ({parsedContexts.length} detected)
              </InputLabel>
              <Select
                labelId="context-select-label"
                value={selectedContext}
                label={`Target Context (${parsedContexts.length} detected)`}
                onChange={(e) => setSelectedContext(e.target.value)}
                sx={{ color: '#f8fafc', bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 2 }}
              >
                {parsedContexts.map((ctx) => (
                  <MenuItem key={ctx} value={ctx}>
                    {ctx}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Raw YAML Paste Area */}
          <Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, display: 'block' }}>
              Or paste Kubeconfig YAML text:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={8}
              placeholder={`apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
    certificate-authority-data: ...
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: admin
  name: default
current-context: default
users:
- name: admin
  user:
    client-certificate-data: ...`}
              value={kubeconfigRaw}
              onChange={(e) => handleKubeconfigChange(e.target.value)}
              slotProps={{
                input: {
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#f8fafc',
                    bgcolor: 'rgba(15, 23, 42, 0.7)',
                    borderRadius: 2,
                  },
                },
              }}
            />
          </Box>
        </Box>

        {/* Pre-flight Connection Result Alerts */}
        {testResult && (
          <Box sx={{ mt: 2.5 }}>
            {testResult.success ? (
              <Alert
                severity="success"
                icon={<CheckCircleIcon fontSize="inherit" />}
                sx={{
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Pre-flight Connection Successful!
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                  {testResult.version && <Chip label={`K8s ${testResult.version}`} size="small" color="success" />}
                  {testResult.nodeCount !== undefined && (
                    <Chip label={`${testResult.nodeCount} Node${testResult.nodeCount === 1 ? '' : 's'}`} size="small" color="success" />
                  )}
                  {testResult.latencyMs !== undefined && (
                    <Chip label={`${testResult.latencyMs}ms latency`} size="small" variant="outlined" sx={{ color: '#34d399' }} />
                  )}
                </Box>
              </Alert>
            ) : (
              <Alert
                severity="error"
                icon={<ErrorIcon fontSize="inherit" />}
                sx={{
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Connection Failed
                </Typography>
                <Typography variant="caption">{testResult.error}</Typography>
              </Alert>
            )}
          </Box>
        )}

        {errorMessage && !testResult && (
          <Box sx={{ mt: 2 }}>
            <Alert
              severity="error"
              sx={{
                bgcolor: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 2,
              }}
            >
              {errorMessage}
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderColor: 'rgba(255, 255, 255, 0.08)', gap: 1.5 }}>
        <Button onClick={handleResetAndClose} sx={{ color: '#94a3b8', textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>

        <Button
          variant="outlined"
          color="info"
          onClick={handleTestConnection}
          disabled={testing || !isFormValid}
          startIcon={testing ? <CircularProgress size={16} color="inherit" /> : <NetworkCheckIcon />}
          sx={{
            borderColor: 'rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            '&:hover': { borderColor: '#38bdf8', bgcolor: 'rgba(56, 189, 248, 0.08)' },
          }}
        >
          {testing ? 'Testing Connectivity...' : 'Test Connection'}
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveCluster}
          disabled={saving || !isFormValid}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <HubIcon />}
          sx={{
            bgcolor: '#0284c7',
            color: '#ffffff',
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            '&:hover': { bgcolor: '#0369a1' },
          }}
        >
          {saving ? 'Connecting...' : 'Connect Cluster'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
