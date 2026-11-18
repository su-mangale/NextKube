'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Switch,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LanIcon from '@mui/icons-material/Lan';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LayersIcon from '@mui/icons-material/Layers';
import { useHelmCatalog, installHelmRelease } from '../api/dashboard.api';
import { HelmCatalogItem } from '../types/dashboard.types';

export interface HelmAppStoreProps {
  clusterId: string;
  namespaces?: string[];
  currentNamespace?: string;
  onReleaseInstalled?: () => void;
}

export function HelmAppStore({
  clusterId,
  namespaces = ['default'],
  currentNamespace = 'default',
  onReleaseInstalled,
}: HelmAppStoreProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedChart, setSelectedChart] = useState<HelmCatalogItem | null>(null);

  // Deploy Dialog State
  const [deployDialogOpen, setDeployDialogOpen] = useState<boolean>(false);
  const [targetNamespace, setTargetNamespace] = useState<string>(currentNamespace || 'default');
  const [releaseName, setReleaseName] = useState<string>('');
  const [valuesYaml, setValuesYaml] = useState<string>('');
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [editorMode, setEditorMode] = useState<'form' | 'yaml'>('form');
  const [installing, setInstalling] = useState<boolean>(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState<string | null>(null);

  const { data: catalog = [], isLoading, error } = useHelmCatalog(clusterId);

  const categories = ['All', 'Networking', 'Monitoring', 'Databases', 'GitOps', 'AI & ML', 'Security'];

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        item.displayName.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, searchQuery]);

  const handleOpenDeploy = (chart: HelmCatalogItem) => {
    setSelectedChart(chart);
    setReleaseName(`${chart.name}-${Math.floor(1000 + Math.random() * 9000)}`);
    setTargetNamespace(currentNamespace && currentNamespace !== 'all' ? currentNamespace : 'default');
    setValuesYaml(chart.defaultValuesYaml);

    // Initialize form defaults
    const initialForm: Record<string, any> = {};
    chart.schemaFields.forEach((field) => {
      initialForm[field.key] = field.defaultValue;
    });
    setFormValues(initialForm);
    setInstallError(null);
    setInstallSuccess(null);
    setDeployDialogOpen(true);
  };

  const handleFormFieldChange = (key: string, value: any) => {
    setFormValues((prev) => {
      const updated = { ...prev, [key]: value };
      // Regenerate valuesYaml from schema fields
      let yaml = selectedChart?.defaultValuesYaml || '';
      Object.entries(updated).forEach(([k, v]) => {
        const parts = k.split('.');
        const lastKey = parts[parts.length - 1];
        const valStr = typeof v === 'boolean' ? (v ? 'true' : 'false') : typeof v === 'number' ? `${v}` : `"${v}"`;
        const regex = new RegExp(`(${lastKey}:\\s*)(.*)`, 'g');
        if (regex.test(yaml)) {
          yaml = yaml.replace(regex, `$1${valStr}`);
        }
      });
      setValuesYaml(yaml);
      return updated;
    });
  };

  const handleDeploy = async () => {
    if (!selectedChart) return;
    setInstalling(true);
    setInstallError(null);
    try {
      await installHelmRelease(
        clusterId,
        targetNamespace,
        releaseName,
        selectedChart.name,
        valuesYaml
      );
      setInstallSuccess(`Release '${releaseName}' deployed successfully!`);
      setTimeout(() => {
        setDeployDialogOpen(false);
        onReleaseInstalled?.();
      }, 1500);
    } catch (err: any) {
      setInstallError(err.message || 'Deployment failed.');
    } finally {
      setInstalling(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Networking':
        return <LanIcon fontSize="small" sx={{ color: '#06b6d4' }} />;
      case 'Monitoring':
        return <SpeedIcon fontSize="small" sx={{ color: '#8b5cf6' }} />;
      case 'Databases':
        return <StorageIcon fontSize="small" sx={{ color: '#f59e0b' }} />;
      case 'Security':
        return <SecurityIcon fontSize="small" sx={{ color: '#10b981' }} />;
      case 'AI & ML':
        return <AutoAwesomeIcon fontSize="small" sx={{ color: '#ec4899' }} />;
      default:
        return <LayersIcon fontSize="small" sx={{ color: '#3b82f6' }} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* HEADER & FILTER BAR */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', py: 0.5 }}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Chip
                key={cat}
                label={cat}
                onClick={() => setSelectedCategory(cat)}
                variant={isSelected ? 'filled' : 'outlined'}
                color={isSelected ? 'primary' : 'default'}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  borderColor: isSelected ? 'transparent' : theme.palette.divider,
                }}
              />
            );
          })}
        </Box>

        <TextField
          size="small"
          placeholder="Search charts (e.g. nginx, redis, grafana)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiInputBase-root': { fontSize: '0.82rem', borderRadius: 2, width: 280 },
          }}
        />
      </Box>

      {/* CATALOG GRID */}
      {isLoading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress size={36} />
        </Box>
      ) : error ? (
        <Alert severity="error">Failed to load Helm catalog: {(error as Error).message}</Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          {filteredCatalog.map((chart) => (
            <Paper
              key={chart.id}
              elevation={0}
              sx={{
                p: 2.2,
                borderRadius: 2.5,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  borderColor: alpha(theme.palette.primary.main, 0.5),
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
                },
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                {/* Header: Icon + Category Badge */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getCategoryIcon(chart.category)}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.92rem' }}>
                        {chart.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Repo: {chart.repo}
                      </Typography>
                    </Box>
                  </Box>

                  <Chip
                    size="small"
                    label={chart.category}
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      height: 20,
                      borderRadius: 1,
                      bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }}
                  />
                </Box>

                {/* Description */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: '0.8rem',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: 38,
                  }}
                >
                  {chart.description}
                </Typography>

                {/* Version pills */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={`Chart ${chart.version}`}
                    sx={{ fontSize: '0.65rem', height: 18, fontFamily: 'monospace' }}
                  />
                  <Chip
                    size="small"
                    label={`App ${chart.appVersion}`}
                    sx={{ fontSize: '0.65rem', height: 18, fontFamily: 'monospace' }}
                  />
                </Box>
              </Box>

              {/* Action Button */}
              <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Button
                  size="small"
                  variant="contained"
                  fullWidth
                  startIcon={<CloudDownloadIcon />}
                  onClick={() => handleOpenDeploy(chart)}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                  }}
                >
                  1-Click Deploy
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* DEPLOY CONFIGURATION DIALOG */}
      <Dialog
        open={deployDialogOpen}
        onClose={() => !installing && setDeployDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              bgcolor: isDark ? '#0f172a' : '#ffffff',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
            },
          },
        }}
      >
        {selectedChart && (
          <>
            <DialogTitle
              sx={{
                p: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CloudDownloadIcon sx={{ color: theme.palette.primary.main, fontSize: 26 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Deploy {selectedChart.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Chart: {selectedChart.name} ({selectedChart.version}) · Repo: {selectedChart.repo}
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setDeployDialogOpen(false)} disabled={installing}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {installError && <Alert severity="error">{installError}</Alert>}
              {installSuccess && <Alert severity="success">{installSuccess}</Alert>}

              {/* Release Metadata Row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Release Name"
                  size="small"
                  value={releaseName}
                  onChange={(e) => setReleaseName(e.target.value)}
                  disabled={installing}
                  helperText="Unique identifier for this Helm release in the cluster"
                />

                <FormControl size="small">
                  <InputLabel>Target Namespace</InputLabel>
                  <Select
                    value={targetNamespace}
                    label="Target Namespace"
                    onChange={(e) => setTargetNamespace(e.target.value)}
                    disabled={installing}
                  >
                    {namespaces.filter((ns) => ns !== 'all').map((ns) => (
                      <MenuItem key={ns} value={ns}>
                        {ns}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Divider />

              {/* Values Editor Mode Switcher */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Configuration Values ({editorMode === 'form' ? 'Interactive Form' : 'Raw YAML'})
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button
                    size="small"
                    variant={editorMode === 'form' ? 'contained' : 'outlined'}
                    onClick={() => setEditorMode('form')}
                    sx={{ borderRadius: 1.5, fontSize: '0.72rem' }}
                  >
                    Visual Form
                  </Button>
                  <Button
                    size="small"
                    variant={editorMode === 'yaml' ? 'contained' : 'outlined'}
                    onClick={() => setEditorMode('yaml')}
                    sx={{ borderRadius: 1.5, fontSize: '0.72rem' }}
                  >
                    Raw YAML
                  </Button>
                </Box>
              </Box>

              {/* Mode 1: Interactive Form Mode */}
              {editorMode === 'form' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {selectedChart.schemaFields.map((field) => (
                    <Paper key={field.key} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {field.label}
                        </Typography>
                        {field.type === 'boolean' && (
                          <Switch
                            checked={Boolean(formValues[field.key])}
                            onChange={(e) => handleFormFieldChange(field.key, e.target.checked)}
                            disabled={installing}
                          />
                        )}
                      </Box>
                      {field.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {field.description}
                        </Typography>
                      )}

                      {field.type === 'text' && (
                        <TextField
                          size="small"
                          fullWidth
                          value={formValues[field.key] || ''}
                          onChange={(e) => handleFormFieldChange(field.key, e.target.value)}
                          disabled={installing}
                        />
                      )}

                      {field.type === 'number' && (
                        <TextField
                          size="small"
                          type="number"
                          fullWidth
                          value={formValues[field.key] || 0}
                          onChange={(e) => handleFormFieldChange(field.key, parseInt(e.target.value, 10))}
                          disabled={installing}
                        />
                      )}

                      {field.type === 'select' && field.options && (
                        <FormControl size="small" fullWidth>
                          <Select
                            value={formValues[field.key] || field.options[0]}
                            onChange={(e) => handleFormFieldChange(field.key, e.target.value)}
                            disabled={installing}
                          >
                            {field.options.map((opt) => (
                              <MenuItem key={opt} value={opt}>
                                {opt}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </Paper>
                  ))}
                </Box>
              ) : (
                /* Mode 2: Raw YAML Mode */
                <TextField
                  multiline
                  minRows={10}
                  maxRows={16}
                  fullWidth
                  value={valuesYaml}
                  onChange={(e) => setValuesYaml(e.target.value)}
                  disabled={installing}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      bgcolor: '#090d16',
                      color: '#38bdf8',
                    },
                  }}
                />
              )}
            </DialogContent>

            <DialogActions
              sx={{
                p: 2.5,
                borderTop: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Button size="small" onClick={() => setDeployDialogOpen(false)} disabled={installing}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={installing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                disabled={installing || !releaseName.trim()}
                onClick={handleDeploy}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                {installing ? 'Deploying Release...' : 'Deploy to Cluster'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
