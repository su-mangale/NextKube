'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Chip,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import HubIcon from '@mui/icons-material/Hub';
import KeyIcon from '@mui/icons-material/Key';
import DescriptionIcon from '@mui/icons-material/Description';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import jsyaml from 'js-yaml';
import { useQueryClient } from '@tanstack/react-query';
import { AttachedClusterPayload, ClusterConnectionTestResult, FleetEnvironment } from '../types/fleet.types';
import { useCluster } from '../context/cluster-context';

export interface AddClusterDialogProps {
  open: boolean;
  onClose: () => void;
  onClusterAdded?: (clusterId: string) => void;
}

export function AddClusterDialog({ open, onClose, onClusterAdded }: AddClusterDialogProps) {
  const queryClient = useQueryClient();
  const { availableFleets, attachCluster, setActiveClusterId } = useCluster();

  // Active Tab: 0 = Kubeconfig, 1 = ServiceAccount Token
  const [activeTab, setActiveTab] = useState(0);

  // Common metadata
  const [clusterName, setClusterName] = useState('');
  const [provider, setProvider] = useState<'GCP' | 'AWS' | 'Azure' | 'Nutanix' | 'OpenShift' | 'Baremetal' | 'Kind' | 'Minikube' | 'Custom'>('Custom');
  const [environment, setEnvironment] = useState<FleetEnvironment>('production');
  const [fleetId, setFleetId] = useState('fleet-prod');

  // Kubeconfig tab states
  const [kubeconfigRaw, setKubeconfigRaw] = useState('');
  const [selectedContext, setSelectedContext] = useState('');
  const [parsedContexts, setParsedContexts] = useState<string[]>([]);
  const [kubeconfigFileName, setKubeconfigFileName] = useState<string | null>(null);

  // ServiceAccount Token tab states
  const [serverUrl, setServerUrl] = useState('');
  const [serviceToken, setServiceToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [caCert, setCaCert] = useState('');
  const [skipTls, setSkipTls] = useState(false);

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
      method: activeTab === 0 ? 'kubeconfig' : 'serviceToken',
      kubeconfigRaw: activeTab === 0 ? kubeconfigRaw : undefined,
      contextName: activeTab === 0 ? selectedContext : undefined,
      serverUrl: activeTab === 1 ? serverUrl : undefined,
      serviceToken: activeTab === 1 ? serviceToken : undefined,
      caCert: activeTab === 1 ? caCert : undefined,
      skipTls: activeTab === 1 ? skipTls : undefined,
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

    if (activeTab === 0 && !kubeconfigRaw.trim()) {
      setErrorMessage('Kubeconfig content is required.');
      return;
    }

    if (activeTab === 1 && (!serverUrl.trim() || !serviceToken.trim())) {
      setErrorMessage('API Server URL and ServiceAccount Token are both required.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const payload: AttachedClusterPayload = {
      name: clusterName.trim(),
      provider,
      environment,
      fleetId,
      method: activeTab === 0 ? 'kubeconfig' : 'serviceToken',
      kubeconfigRaw: activeTab === 0 ? kubeconfigRaw : undefined,
      contextName: activeTab === 0 ? selectedContext : undefined,
      serverUrl: activeTab === 1 ? serverUrl.trim() : undefined,
      serviceToken: activeTab === 1 ? serviceToken.trim() : undefined,
      caCert: activeTab === 1 ? caCert.trim() : undefined,
      skipTls: activeTab === 1 ? skipTls : undefined,
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
    setServerUrl('');
    setServiceToken('');
    setCaCert('');
    setSkipTls(false);
    setTestResult(null);
    setErrorMessage(null);
    onClose();
  };

  const isFormValid = useMemo(() => {
    if (!clusterName.trim()) return false;
    if (activeTab === 0) return Boolean(kubeconfigRaw.trim());
    if (activeTab === 1) return Boolean(serverUrl.trim() && serviceToken.trim());
    return false;
  }, [clusterName, activeTab, kubeconfigRaw, serverUrl, serviceToken]);

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
              Add a cluster via Kubeconfig or ServiceAccount Bearer Token
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleResetAndClose} size="small" sx={{ color: '#94a3b8' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', py: 2 }}>
        {/* Method Switcher Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => {
              setActiveTab(val);
              setTestResult(null);
              setErrorMessage(null);
            }}
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '0.88rem',
                textTransform: 'none',
                minHeight: 44,
                '&.Mui-selected': { color: '#38bdf8' },
              },
              '& .MuiTabs-indicator': { bgcolor: '#38bdf8' },
            }}
          >
            <Tab
              icon={<DescriptionIcon sx={{ fontSize: '1.1rem !important', mr: 0.8 }} />}
              iconPosition="start"
              label="Kubeconfig File / YAML"
            />
            <Tab
              icon={<KeyIcon sx={{ fontSize: '1.1rem !important', mr: 0.8 }} />}
              iconPosition="start"
              label="ServiceAccount Token"
            />
          </Tabs>
        </Box>

        {/* Common Cluster Details */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2.5 }}>
          <TextField
            label="Cluster Display Name"
            placeholder="e.g. Production US-East GKE"
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
              <MenuItem value="Nutanix">Nutanix AHV</MenuItem>
              <MenuItem value="OpenShift">Red Hat OpenShift</MenuItem>
              <MenuItem value="Baremetal">Baremetal / K3s</MenuItem>
              <MenuItem value="Custom">Custom / Other</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel id="env-select-label" sx={{ color: '#94a3b8' }}>
              Environment Tier
            </InputLabel>
            <Select
              labelId="env-select-label"
              value={environment}
              label="Environment Tier"
              onChange={(e) => setEnvironment(e.target.value as any)}
              sx={{ color: '#f8fafc', bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 2 }}
            >
              <MenuItem value="production">Production</MenuItem>
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="development">Development</MenuItem>
              <MenuItem value="edge">Edge / Branch</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel id="fleet-select-label" sx={{ color: '#94a3b8' }}>
              Target Fleet
            </InputLabel>
            <Select
              labelId="fleet-select-label"
              value={fleetId}
              label="Target Fleet"
              onChange={(e) => setFleetId(e.target.value)}
              sx={{ color: '#f8fafc', bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 2 }}
            >
              {availableFleets.map((fleet) => (
                <MenuItem key={fleet.id} value={fleet.id}>
                  {fleet.displayName} ({fleet.environment})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* TAB 0: Kubeconfig Method */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* File Upload Drop Zone */}
            <Box
              component="label"
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px dashed rgba(56, 189, 248, 0.3)',
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
              <CloudUploadIcon sx={{ color: '#38bdf8', fontSize: 28, mb: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#f8fafc' }}>
                {kubeconfigFileName ? `Selected: ${kubeconfigFileName}` : 'Drop .kube/config file here, or click to browse'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Supports standard multi-cluster kubeconfig files
              </Typography>
            </Box>

            {/* Context Selector if multiple contexts found */}
            {parsedContexts.length > 0 && (
              <FormControl size="small" fullWidth>
                <InputLabel id="context-select-label" sx={{ color: '#94a3b8' }}>
                  Target Kubeconfig Context ({parsedContexts.length} detected)
                </InputLabel>
                <Select
                  labelId="context-select-label"
                  value={selectedContext}
                  label={`Target Kubeconfig Context (${parsedContexts.length} detected)`}
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
                rows={7}
                placeholder="apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
    certificate-authority-data: ...
  name: local-kind
contexts:
- context:
    cluster: local-kind
    user: kind-admin
  name: kind-local
current-context: kind-local
users:
- name: kind-admin
  user:
    client-certificate-data: ..."
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
        )}

        {/* TAB 1: ServiceAccount Token Method */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Kubernetes API Server URL"
              placeholder="https://kubernetes.default.svc:443 or https://34.120.45.10:6443"
              size="small"
              required
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              slotProps={{
                input: {
                  sx: { color: '#f8fafc', bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 2 },
                },
              }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="ServiceAccount Bearer Token"
              placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
              size="small"
              required
              type={showToken ? 'text' : 'password'}
              value={serviceToken}
              onChange={(e) => setServiceToken(e.target.value)}
              slotProps={{
                input: {
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#f8fafc',
                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: 2,
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle token visibility"
                        onClick={() => setShowToken(!showToken)}
                        edge="end"
                        size="small"
                        sx={{ color: '#64748b' }}
                      >
                        {showToken ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Certificate Authority Data (PEM, Optional)"
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              size="small"
              value={caCert}
              onChange={(e) => setCaCert(e.target.value)}
              slotProps={{
                input: {
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    color: '#f8fafc',
                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: 2,
                  },
                },
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={skipTls}
                  onChange={(e) => setSkipTls(e.target.checked)}
                  sx={{ color: '#38bdf8', '&.Mui-checked': { color: '#38bdf8' } }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#f8fafc' }}>
                    Insecure Skip TLS Verify
                  </Typography>
                  <Chip
                    label="Dev / Kind Only"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      bgcolor: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  />
                </Box>
              }
            />
          </Box>
        )}

        {/* Live Feedback: Test Results / Errors */}
        {testResult && testResult.success && (
          <Alert
            icon={<CheckCircleIcon fontSize="inherit" />}
            severity="success"
            sx={{
              mt: 2.5,
              bgcolor: 'rgba(16, 185, 129, 0.15)',
              color: '#6ee7b7',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 2,
            }}
          >
            Connected to API Server successfully! Detected Kubernetes{' '}
            <Box component="strong" sx={{ color: '#ffffff' }}>
              {testResult.version || 'v1.31.0'}
            </Box>
            {testResult.nodeCount !== undefined && ` • ${testResult.nodeCount} Nodes`}
            {testResult.latencyMs !== undefined && ` (${testResult.latencyMs}ms latency)`}
          </Alert>
        )}

        {errorMessage && (
          <Alert
            icon={<ErrorIcon fontSize="inherit" />}
            severity="error"
            sx={{
              mt: 2.5,
              bgcolor: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 2,
            }}
          >
            {errorMessage}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', bgcolor: '#0b0f19' }}>
        <Button
          variant="outlined"
          color="info"
          startIcon={testing ? <CircularProgress size={16} sx={{ color: '#38bdf8' }} /> : <NetworkCheckIcon />}
          disabled={testing || saving || !isFormValid}
          onClick={handleTestConnection}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            color: '#38bdf8',
            borderColor: 'rgba(56, 189, 248, 0.4)',
            '&:hover': { borderColor: '#38bdf8', bgcolor: 'rgba(56, 189, 248, 0.08)' },
          }}
        >
          {testing ? 'Testing Connection...' : 'Test Connection'}
        </Button>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button onClick={handleResetAndClose} disabled={saving} sx={{ color: '#94a3b8', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving || !isFormValid}
            onClick={handleSaveCluster}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#0891b2',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(8, 145, 178, 0.4)',
              '&:hover': { bgcolor: '#0e7490' },
            }}
          >
            {saving ? <CircularProgress size={20} sx={{ color: '#ffffff' }} /> : 'Attach Cluster'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
