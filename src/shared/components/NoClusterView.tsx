'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
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
  Paper,
  Tooltip,
  useTheme,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HubIcon from '@mui/icons-material/Hub';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import jsyaml from 'js-yaml';
import { useQueryClient } from '@tanstack/react-query';
import { AttachedClusterPayload, ClusterConnectionTestResult } from '../types/fleet.types';
import { useCluster } from '../context/cluster-context';
import { logout } from '../hooks/use-auth';

export function NoClusterView() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const queryClient = useQueryClient();
  const { attachCluster, setActiveClusterId } = useCluster();

  // Cluster metadata
  const [clusterName, setClusterName] = useState('');
  const [provider, setProvider] = useState<'GCP' | 'AWS' | 'Azure' | 'Baremetal' | 'Kind' | 'Minikube' | 'OpenShift' | 'Custom'>('Custom');

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

      attachCluster(payload);
      await queryClient.invalidateQueries({ queryKey: ['clustersList'] });
      const targetId = data.cluster?.id || clusterName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      setActiveClusterId(targetId);
      window.location.href = `/clusters/${targetId}`;
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving cluster to vault.');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = useMemo(() => {
    return Boolean(clusterName.trim() && kubeconfigRaw.trim());
  }, [clusterName, kubeconfigRaw]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: isDark ? '#0b0f19' : '#f8fafc' }}>
      {/* Top Header */}
      <Box
        component="header"
        sx={{
          py: 1.5,
          px: 3,
          bgcolor: isDark ? '#0f172a' : '#ffffff',
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label="No Cluster Connected"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 700, height: 24, fontSize: '0.72rem', borderRadius: 1.5 }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon sx={{ fontSize: '1rem !important' }} />}
            onClick={() => router.push('/settings')}
            sx={{
              fontWeight: 650,
              fontSize: '0.78rem',
              borderRadius: 2,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
              color: isDark ? '#f8fafc' : '#0f172a',
              textTransform: 'none',
              height: 28,
              px: 1.5,
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                color: 'primary.main',
              },
            }}
          >
            Settings
          </Button>

          <Tooltip title="Sign Out of NextKube">
            <IconButton
              onClick={() => logout()}
              size="small"
              sx={{
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
                borderRadius: 2,
                p: 0.8,
                color: isDark ? '#94a3b8' : '#64748b',
                '&:hover': { color: 'error.main', borderColor: 'error.main' },
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Centered Onboarding Dropzone Card */}
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 4 } }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 780,
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            bgcolor: isDark ? '#0f172a' : '#ffffff',
            backgroundImage: isDark ? 'linear-gradient(to bottom, #111827, #0b0f19)' : 'none',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              : '0 20px 45px -10px rgba(15, 23, 42, 0.08)',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3.5 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.1)',
                border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(2, 132, 199, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
              }}
            >
              <HubIcon sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 32 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', letterSpacing: '-0.02em', mb: 0.8 }}>
              No Kubernetes Cluster Connected
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b', maxWidth: 540, mx: 'auto', lineHeight: 1.6 }}>
              Connect your Kubernetes cluster using your <code style={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 600 }}>kubeconfig</code> file to begin monitoring pods, deployments, nodes, and managing cluster workloads.
            </Typography>
          </Box>

          {/* Form Fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
              <TextField
                label="Cluster Name"
                placeholder="e.g. Production-Cluster"
                size="small"
                required
                value={clusterName}
                onChange={(e) => setClusterName(e.target.value)}
                slotProps={{
                  inputLabel: {
                    sx: { color: isDark ? '#94a3b8' : '#64748b' },
                  },
                  input: {
                    sx: {
                      color: isDark ? '#f8fafc' : '#0f172a',
                      bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                      borderRadius: 2,
                    },
                  },
                }}
              />

              <FormControl size="small">
                <InputLabel id="provider-select-label" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Provider
                </InputLabel>
                <Select
                  labelId="provider-select-label"
                  value={provider}
                  label="Provider"
                  onChange={(e) => setProvider(e.target.value as any)}
                  sx={{
                    color: isDark ? '#f8fafc' : '#0f172a',
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="GCP">GCP (GKE)</MenuItem>
                  <MenuItem value="AWS">AWS (EKS)</MenuItem>
                  <MenuItem value="Azure">Azure (AKS)</MenuItem>
                  <MenuItem value="Kind">KinD</MenuItem>
                  <MenuItem value="Minikube">Minikube</MenuItem>
                  <MenuItem value="Baremetal">Baremetal / K3s</MenuItem>
                  <MenuItem value="OpenShift">OpenShift</MenuItem>
                  <MenuItem value="Custom">Custom / Other</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* File Upload Drop Zone */}
            <Box
              component="label"
              sx={{
                p: 3,
                borderRadius: 2.5,
                border: isDark ? '1.5px dashed rgba(56, 189, 248, 0.35)' : '1.5px dashed rgba(2, 132, 199, 0.4)',
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.03)' : 'rgba(2, 132, 199, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: isDark ? '#38bdf8' : '#0284c7',
                  bgcolor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.08)',
                },
              }}
            >
              <input type="file" accept=".yaml,.yml,.conf" hidden onChange={handleFileUpload} />
              <CloudUploadIcon sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 36, mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', mb: 0.3 }}>
                {kubeconfigFileName ? `Selected: ${kubeconfigFileName}` : 'Drop .kube/config file here, or click to browse'}
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Supports standard Kubernetes config files (.yaml, .yml, .conf)
              </Typography>
            </Box>

            {/* Context Selector if multiple contexts found */}
            {parsedContexts.length > 0 && (
              <FormControl size="small" fullWidth>
                <InputLabel id="context-select-label" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Select Context ({parsedContexts.length} detected)
                </InputLabel>
                <Select
                  labelId="context-select-label"
                  value={selectedContext}
                  label={`Select Context (${parsedContexts.length} detected)`}
                  onChange={(e) => setSelectedContext(e.target.value)}
                  sx={{
                    color: isDark ? '#f8fafc' : '#0f172a',
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                    borderRadius: 2,
                  }}
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
              <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>
                Or paste Kubeconfig YAML text:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={7}
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
                      color: isDark ? '#f8fafc' : '#0f172a',
                      bgcolor: isDark ? 'rgba(15, 23, 42, 0.7)' : '#f8fafc',
                      borderRadius: 2,
                    },
                  },
                }}
              />
            </Box>

            {/* Pre-flight Connection Result Alerts */}
            {testResult && (
              <Box>
                {testResult.success ? (
                  <Alert
                    severity="success"
                    icon={<CheckCircleIcon fontSize="inherit" />}
                    sx={{
                      bgcolor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
                      color: isDark ? '#34d399' : '#059669',
                      border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #a7f3d0',
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
                        <Chip label={`${testResult.latencyMs}ms latency`} size="small" variant="outlined" sx={{ color: isDark ? '#34d399' : '#059669' }} />
                      )}
                    </Box>
                  </Alert>
                ) : (
                  <Alert
                    severity="error"
                    icon={<ErrorIcon fontSize="inherit" />}
                    sx={{
                      bgcolor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                      color: isDark ? '#f87171' : '#dc2626',
                      border: isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #fecaca',
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
              <Alert
                severity="error"
                sx={{
                  bgcolor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                  color: isDark ? '#f87171' : '#dc2626',
                  border: isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #fecaca',
                  borderRadius: 2,
                }}
              >
                {errorMessage}
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
              <Button
                variant="outlined"
                color="info"
                onClick={handleTestConnection}
                disabled={testing || !isFormValid}
                startIcon={testing ? <CircularProgress size={16} color="inherit" /> : <NetworkCheckIcon />}
                sx={{
                  borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#0284c7',
                  color: isDark ? '#38bdf8' : '#0284c7',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2.5,
                  '&:hover': {
                    borderColor: isDark ? '#38bdf8' : '#0369a1',
                    bgcolor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.08)',
                  },
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
                  px: 3,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                  '&:hover': { bgcolor: '#0369a1' },
                }}
              >
                {saving ? 'Connecting...' : 'Connect Cluster'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
