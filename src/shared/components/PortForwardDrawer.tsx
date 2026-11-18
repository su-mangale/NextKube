'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Paper,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  useTheme,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AltRouteRoundedIcon from '@mui/icons-material/AltRouteRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LanRoundedIcon from '@mui/icons-material/LanRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import {
  usePortForwards,
  usePortForwardTargets,
  startPortForward,
  stopPortForward,
} from '../api/dashboard.api';
import { copyTextToClipboard } from '../utils/clipboard';

export interface PortForwardDrawerProps {
  open: boolean;
  onClose: () => void;
  clusterId: string;
  namespaces?: string[];
  initialTarget?: {
    targetType: 'pod' | 'service';
    targetName: string;
    namespace: string;
    ports?: number[];
  } | null;
}

export function PortForwardDrawer({
  open,
  onClose,
  clusterId,
  namespaces = ['default'],
  initialTarget = null,
}: PortForwardDrawerProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // API query
  const { data: portForwards = [], isLoading, refetch } = usePortForwards(clusterId);

  // View state: 'list' | 'create'
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  // Form states
  const [formType, setFormType] = useState<'pod' | 'service'>('pod');
  const [formNamespace, setFormNamespace] = useState<string>('default');
  const [formTargetName, setFormTargetName] = useState<string>('');
  const [formTargetPort, setFormTargetPort] = useState<number | ''>('');
  const [formLocalPort, setFormLocalPort] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Copied feedback map
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Targets query for the selected namespace
  const { data: targetOptions = [] } = usePortForwardTargets(clusterId, formNamespace);

  // Handle initial target if passed from row click
  useEffect(() => {
    if (initialTarget && open) {
      setFormType(initialTarget.targetType);
      setFormNamespace(initialTarget.namespace || 'default');
      setFormTargetName(initialTarget.targetName);
      if (initialTarget.ports && initialTarget.ports.length > 0) {
        setFormTargetPort(initialTarget.ports[0]);
      } else {
        setFormTargetPort('');
      }
      setViewMode('create');
    }
  }, [initialTarget, open]);

  // Filter available targets for the chosen type (pod vs service)
  const availableTargets = useMemo(() => {
    return (targetOptions || []).filter((t) => t.type === formType);
  }, [targetOptions, formType]);

  // Current target's declared ports
  const detectedPorts = useMemo(() => {
    const found = availableTargets.find((t) => t.name === formTargetName);
    return found ? found.ports : [];
  }, [availableTargets, formTargetName]);

  const handleCopy = async (key: string, text: string) => {
    await copyTextToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStartTunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTargetName) {
      setFormError('Please select or specify a target resource name.');
      return;
    }
    if (!formTargetPort || Number(formTargetPort) <= 0) {
      setFormError('Please enter a valid target port number.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      await startPortForward(clusterId, {
        namespace: formNamespace,
        targetType: formType,
        targetName: formTargetName,
        targetPort: Number(formTargetPort),
        localPort: formLocalPort ? Number(formLocalPort) : undefined,
      });

      await refetch();
      setViewMode('list');
      setFormTargetName('');
      setFormTargetPort('');
      setFormLocalPort('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to start port forward tunnel.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopTunnel = async (sessionId: string) => {
    try {
      await stopPortForward(clusterId, sessionId);
      await refetch();
    } catch (err: any) {
      console.error('Failed to stop port forward:', err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 540 },
            bgcolor: isDark ? '#0b0f19' : '#ffffff',
            backgroundImage: 'none',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: isDark
              ? '-8px 0 32px rgba(0, 0, 0, 0.7)'
              : '-8px 0 32px rgba(0, 0, 0, 0.1)',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.9)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)',
              color: '#38bdf8',
            }}
          >
            <AltRouteRoundedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Port-Forward Manager
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Direct TCP & HTTP tunnels into internal Kubernetes services & pods
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {viewMode === 'list' ? (
            <Button
              size="small"
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                setFormError(null);
                setViewMode('create');
              }}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                fontSize: '0.8rem',
                py: 0.5,
                px: 1.5,
              }}
            >
              New Tunnel
            </Button>
          ) : (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setViewMode('list')}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, fontSize: '0.8rem' }}
            >
              Back to List
            </Button>
          )}

          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Main Drawer Body */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
        {viewMode === 'list' ? (
          /* ACTIVE TUNNELS LIST */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 750, color: 'text.secondary' }}>
                Active Port-Forward Tunnels
              </Typography>
              <Chip
                label={`${portForwards.length} Active`}
                size="small"
                color={portForwards.length > 0 ? 'success' : 'default'}
                sx={{ fontWeight: 800, fontSize: '0.68rem', height: 20 }}
              />
            </Box>

            {isLoading && portForwards.length === 0 ? (
              <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={30} />
              </Box>
            ) : portForwards.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: 3,
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                  borderStyle: 'dashed',
                }}
              >
                <AltRouteRoundedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 750, mb: 0.5 }}>
                  No Active Port Forwards
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto', mb: 2.5 }}>
                  Expose private Redis caches, PostgreSQL instances, internal APIs, or web dashboards to your local machine in 1 click.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => setViewMode('create')}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Create Port Forward
                </Button>
              </Paper>
            ) : (
              portForwards.map((session) => (
                <Paper
                  key={session.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: isDark ? '#111827' : '#ffffff',
                    border: '1px solid',
                    borderColor: session.status === 'active' ? (isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.25)') : 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    transition: 'all 0.2s ease',
                    boxShadow: session.status === 'active' ? (isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 16px rgba(0, 0, 0, 0.05)') : undefined,
                  }}
                >
                  {/* Top Bar: Target & Status */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Chip
                        icon={session.targetType === 'pod' ? <RocketLaunchRoundedIcon sx={{ fontSize: '13px !important' }} /> : <LanRoundedIcon sx={{ fontSize: '13px !important' }} />}
                        label={session.targetType.toUpperCase()}
                        size="small"
                        color={session.targetType === 'pod' ? 'info' : 'primary'}
                        sx={{ fontSize: '0.65rem', fontWeight: 800, height: 20, borderRadius: 1 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 750,
                          fontSize: '0.85rem',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {session.targetName}
                      </Typography>
                    </Box>

                    <Chip
                      label={session.status === 'active' ? 'Forwarding' : session.status}
                      size="small"
                      color={session.status === 'active' ? 'success' : 'error'}
                      sx={{ fontSize: '0.65rem', fontWeight: 800, height: 20 }}
                    />
                  </Box>

                  {/* Port Mapping Visual Bar */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.2,
                      borderRadius: 1.8,
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>
                        localhost:{session.localPort}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800 }}>
                        ➜
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        :{session.targetPort}
                      </Typography>
                    </Box>

                    <Chip label={session.namespace} size="small" variant="outlined" sx={{ fontSize: '0.65rem', borderRadius: 1, height: 18 }} />
                  </Box>

                  {/* Telemetry info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                      Traffic: <b>{formatBytes(session.bytesSent + session.bytesReceived)}</b>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                      Active Conns: <b>{session.connectionsCount}</b>
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 0.2 }} />

                  {/* Actions */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Tooltip title="Open in New Browser Tab">
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          component="a"
                          href={`http://localhost:${session.localPort}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          startIcon={<OpenInNewRoundedIcon fontSize="small" />}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0.4, borderRadius: 1.5 }}
                        >
                          Open Browser
                        </Button>
                      </Tooltip>

                      <Tooltip title="Copy local URL">
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(`url-${session.id}`, `http://localhost:${session.localPort}`)}
                          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                        >
                          {copiedKey === `url-${session.id}` ? (
                            <CheckRoundedIcon fontSize="small" color="success" />
                          ) : (
                            <ContentCopyRoundedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Copy native kubectl command">
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleCopy(
                              `kubectl-${session.id}`,
                              `kubectl port-forward -n ${session.namespace} ${session.targetType}/${session.targetName} ${session.localPort}:${session.targetPort}`
                            )
                          }
                          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                        >
                          {copiedKey === `kubectl-${session.id}` ? (
                            <CheckRoundedIcon fontSize="small" color="success" />
                          ) : (
                            <TerminalRoundedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={<PowerSettingsNewRoundedIcon fontSize="small" />}
                      onClick={() => handleStopTunnel(session.id)}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0.4, borderRadius: 1.5 }}
                    >
                      Stop Tunnel
                    </Button>
                  </Box>
                </Paper>
              ))
            )}
          </Box>
        ) : (
          /* CREATE NEW PORT FORWARD FORM */
          <Box component="form" onSubmit={handleStartTunnel} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Configure New Port-Forward Tunnel
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a target Pod or Service to expose on your host.
              </Typography>
            </Box>

            {formError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {formError}
              </Alert>
            )}

            {/* Target Type Selector: Pod vs Service */}
            <Box sx={{ display: 'flex', gap: 1, p: 0.5, bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)', borderRadius: 2 }}>
              <Button
                fullWidth
                variant={formType === 'pod' ? 'contained' : 'text'}
                color={formType === 'pod' ? 'primary' : 'inherit'}
                onClick={() => {
                  setFormType('pod');
                  setFormTargetName('');
                  setFormTargetPort('');
                }}
                startIcon={<RocketLaunchRoundedIcon />}
                sx={{ textTransform: 'none', fontWeight: 750, borderRadius: 1.5 }}
              >
                Pod Target
              </Button>
              <Button
                fullWidth
                variant={formType === 'service' ? 'contained' : 'text'}
                color={formType === 'service' ? 'primary' : 'inherit'}
                onClick={() => {
                  setFormType('service');
                  setFormTargetName('');
                  setFormTargetPort('');
                }}
                startIcon={<LanRoundedIcon />}
                sx={{ textTransform: 'none', fontWeight: 750, borderRadius: 1.5 }}
              >
                Service Target
              </Button>
            </Box>

            {/* Namespace Selector */}
            <FormControl fullWidth size="small">
              <InputLabel>Namespace</InputLabel>
              <Select
                value={formNamespace}
                label="Namespace"
                onChange={(e) => {
                  setFormNamespace(e.target.value);
                  setFormTargetName('');
                  setFormTargetPort('');
                }}
                sx={{ borderRadius: 2 }}
              >
                {namespaces.map((ns) => (
                  <MenuItem key={ns} value={ns}>
                    {ns}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Target Resource Selector */}
            <FormControl fullWidth size="small">
              <InputLabel>Target {formType === 'pod' ? 'Pod' : 'Service'} Name</InputLabel>
              <Select
                value={formTargetName}
                label={`Target ${formType === 'pod' ? 'Pod' : 'Service'} Name`}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormTargetName(name);
                  const found = availableTargets.find((t) => t.name === name);
                  if (found && found.ports.length > 0) {
                    setFormTargetPort(found.ports[0]);
                  }
                }}
                sx={{ borderRadius: 2 }}
              >
                {availableTargets.map((t) => (
                  <MenuItem key={t.name} value={t.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 650, fontFamily: 'monospace' }}>
                        {t.name}
                      </Typography>
                      {t.ports.length > 0 && (
                        <Chip
                          label={`ports: ${t.ports.join(', ')}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.62rem', height: 18 }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Target Port Selector */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                label="Target Container / Service Port"
                type="number"
                size="small"
                fullWidth
                value={formTargetPort}
                onChange={(e) => setFormTargetPort(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 80, 8080, 5432, 6379"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />

              {detectedPorts.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Detected Ports:
                  </Typography>
                  {detectedPorts.map((p) => (
                    <Chip
                      key={p}
                      label={`:${p}`}
                      size="small"
                      clickable
                      color={formTargetPort === p ? 'primary' : 'default'}
                      onClick={() => setFormTargetPort(p)}
                      sx={{ fontSize: '0.7rem', fontWeight: 750, height: 20 }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {/* Local Port Selector (Optional) */}
            <TextField
              label="Local Port on Host (Optional)"
              type="number"
              size="small"
              fullWidth
              value={formLocalPort}
              onChange={(e) => setFormLocalPort(e.target.value ? Number(e.target.value) : '')}
              placeholder="Leave blank for automatic port assignment"
              helperText="If omitted, an available port will be automatically allocated."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setViewMode('list')}
                disabled={submitting}
                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AltRouteRoundedIcon />}
                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
              >
                {submitting ? 'Connecting...' : 'Start Tunnel'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
