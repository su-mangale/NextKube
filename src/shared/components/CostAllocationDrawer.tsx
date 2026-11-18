'use client';

import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Paper,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Alert,
  useTheme,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  LinearProgress,
  Tabs,
  Tab,
  Collapse,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PieChartRoundedIcon from '@mui/icons-material/PieChartRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import {
  useClusterFinOps,
  applyRightSizingRecommendation,
} from '../api/dashboard.api';
import {
  ResourceCostRates,
  RightSizingRecommendation,
  WorkloadCostBreakdown,
} from '../types/dashboard.types';

export interface CostAllocationDrawerProps {
  open: boolean;
  onClose: () => void;
  clusterId: string;
  embedded?: boolean;
  onSuccessPatch?: (msg: string) => void;
}

export default function CostAllocationDrawer({
  open,
  onClose,
  clusterId,
  embedded = false,
  onSuccessPatch,
}: CostAllocationDrawerProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [activeTab, setActiveTab] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [applyingRecId, setApplyingRecId] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom Rates state
  const [showRateSettings, setShowRateSettings] = useState<boolean>(false);
  const [customRates, setCustomRates] = useState<ResourceCostRates>({
    cpuPerCoreHour: 0.0316,
    memoryPerGiBHour: 0.0042,
    storagePerGiBMonth: 0.10,
  });

  const {
    data: finOps,
    isLoading,
    isRefetching,
    refetch,
  } = useClusterFinOps(clusterId, customRates, { enabled: open || embedded });

  // Filtered workloads
  const filteredWorkloads = useMemo(() => {
    if (!finOps?.topCostlyWorkloads) return [];
    if (!searchQuery.trim()) return finOps.topCostlyWorkloads;
    const q = searchQuery.toLowerCase();
    return finOps.topCostlyWorkloads.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.namespace.toLowerCase().includes(q) ||
        w.kind.toLowerCase().includes(q)
    );
  }, [finOps?.topCostlyWorkloads, searchQuery]);

  // Handle 1-Click Right-Sizing
  const handleApplyRecommendation = async (rec: RightSizingRecommendation) => {
    setApplyingRecId(rec.id);
    setErrorMessage(null);
    setSuccessFeedback(null);
    try {
      const res = await applyRightSizingRecommendation(clusterId, {
        namespace: rec.namespace,
        kind: rec.kind,
        name: rec.workloadName,
        containerName: rec.containerName,
        cpuRequest: rec.recommendedCpuRequest,
        memoryRequest: rec.recommendedMemoryRequest,
        cpuLimit: rec.recommendedCpuLimit,
        memoryLimit: rec.recommendedMemoryLimit,
      });

      if (res.success) {
        setSuccessFeedback(res.message);
        onSuccessPatch?.(res.message);
        refetch();
      } else {
        setErrorMessage(res.message || 'Failed to apply right-sizing patch');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error executing right-sizing patch');
    } finally {
      setApplyingRecId(null);
    }
  };

  // Export report to CSV
  const handleExportCSV = () => {
    if (!finOps) return;
    const headers = ['Namespace,Workload,Kind,Replicas,CPU_Requested,CPU_Used,Memory_Requested_GiB,Memory_Used_GiB,Monthly_Cost_USD,Monthly_Waste_USD,Efficiency_Score,Status'];
    const rows = (finOps.topCostlyWorkloads || []).map((w) =>
      `"${w.namespace}","${w.name}","${w.kind}",${w.replicas},${w.cpuRequestedCores},${w.cpuUsedCores},${w.memoryRequestedGiB},${w.memoryUsedGiB},${w.monthlyCost},${w.wastedMonthlyCost},${w.efficiencyScore}%,"${w.status}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NextKube-FinOps-${clusterId}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open && !embedded) return null;

  const bodyContent = (
    <>
      {/* Drawer Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          bgcolor: isDark ? '#0f172a' : '#ffffff',
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
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
            }}
          >
            <MonetizationOnRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.2 }}>
              Cost Allocation & Right-Sizing Advisor
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Real-time Kubernetes FinOps telemetry · Cluster spend & waste reduction
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Configure Cloud Unit Rates">
            <IconButton
              size="small"
              onClick={() => setShowRateSettings(!showRateSettings)}
              color={showRateSettings ? 'primary' : 'default'}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <TuneRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Telemetry">
            <IconButton
              size="small"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <RefreshRoundedIcon
                fontSize="small"
                sx={{
                  animation: isLoading || isRefetching ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export FinOps Report (CSV)">
            <IconButton
              size="small"
              onClick={handleExportCSV}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <FileDownloadRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!embedded && (
            <IconButton size="small" onClick={onClose} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Loading Progress Bar */}
      {(isLoading || isRefetching) && <LinearProgress color="success" sx={{ height: 2 }} />}

      {/* Rate Settings Collapsible Panel */}
      <Collapse in={showRateSettings}>
        <Box
          sx={{
            p: 2.5,
            bgcolor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', display: 'block', mb: 1.5 }}>
            Cloud Unit Pricing Model (Customizable per AWS / GCP / Azure contract)
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
            <TextField
              label="CPU ($ / vCPU-Hour)"
              type="number"
              size="small"
              value={customRates.cpuPerCoreHour}
              onChange={(e) => setCustomRates({ ...customRates, cpuPerCoreHour: parseFloat(e.target.value) || 0 })}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
            <TextField
              label="Memory ($ / GiB-Hour)"
              type="number"
              size="small"
              value={customRates.memoryPerGiBHour}
              onChange={(e) => setCustomRates({ ...customRates, memoryPerGiBHour: parseFloat(e.target.value) || 0 })}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
            <TextField
              label="Storage ($ / GiB-Month)"
              type="number"
              size="small"
              value={customRates.storagePerGiBMonth}
              onChange={(e) => setCustomRates({ ...customRates, storagePerGiBMonth: parseFloat(e.target.value) || 0 })}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Box>
        </Box>
      </Collapse>

      {/* Drawer Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* KPI Top Cards */}
        {finOps && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
            {/* Monthly Spend */}
            <Card
              variant="outlined"
              sx={{
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                p: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                Est. Monthly Spend
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.5 }}>
                ${finOps.estimatedMonthlySpend.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip
                  label={`${finOps.efficiencyPercentage}% Efficiency`}
                  size="small"
                  color={finOps.efficiencyPercentage > 70 ? 'success' : 'warning'}
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {finOps.totalCpuRequested} cores · {finOps.totalMemoryRequestedGiB} GiB
                </Typography>
              </Box>
            </Card>

            {/* Wasted Spend */}
            <Card
              variant="outlined"
              sx={{
                bgcolor: isDark ? 'rgba(245, 158, 11, 0.04)' : '#fffbeb',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.3)',
                p: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>
                Monthly Wasted Spend
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#f59e0b', mt: 0.5 }}>
                ${finOps.estimatedMonthlyWaste.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <TrendingDownRoundedIcon fontSize="small" sx={{ color: '#10b981' }} />
                <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>
                  Potential ~{Math.round((finOps.estimatedMonthlyWaste / (finOps.estimatedMonthlySpend || 1)) * 100)}% Cost Reduction
                </Typography>
              </Box>
            </Card>

            {/* Right-Sizing Opportunities */}
            <Card
              variant="outlined"
              sx={{
                bgcolor: isDark ? 'rgba(59, 130, 246, 0.04)' : '#eff6ff',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                p: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>
                Actionable Right-Sizing
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#3b82f6', mt: 0.5 }}>
                {finOps.recommendations.length} Workloads
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                1-click automated resource tuning available
              </Typography>
            </Card>
          </Box>
        )}

        {/* Feedback alerts */}
        {successFeedback && (
          <Alert severity="success" onClose={() => setSuccessFeedback(null)}>
            {successFeedback}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
            <Tab
              icon={<AutoFixHighRoundedIcon fontSize="small" />}
              iconPosition="start"
              label={`Right-Sizing Advisor (${finOps?.recommendations?.length || 0})`}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            />
            <Tab
              icon={<MonetizationOnRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="Workload Spenders"
              sx={{ fontWeight: 700, textTransform: 'none' }}
            />
            <Tab
              icon={<PieChartRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="Namespace Allocation"
              sx={{ fontWeight: 700, textTransform: 'none' }}
            />
          </Tabs>
        </Box>

        {/* TAB 0: Right-Sizing Recommendations */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Algorithmic Right-Sizing Recommendations
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Based on historical CPU/Memory telemetry and safety buffers
              </Typography>
            </Box>

            {!finOps?.recommendations || finOps.recommendations.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 40, color: '#10b981', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  All Workloads Right-Sized
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Your cluster workloads have optimal resource requests and limits.
                </Typography>
              </Box>
            ) : (
              finOps.recommendations.map((rec) => (
                <Card
                  key={rec.id}
                  variant="outlined"
                  sx={{
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    borderRadius: 2.5,
                    overflow: 'hidden',
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={rec.kind}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem' }}
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                          {rec.namespace}/{rec.workloadName}
                        </Typography>
                        <Chip
                          label={`container: ${rec.containerName}`}
                          size="small"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      </Box>
                      <Chip
                        label={`Save ~$${rec.estimatedMonthlySavings.toFixed(2)} / mo`}
                        size="small"
                        color="success"
                        sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      {rec.reason}
                    </Typography>

                    {/* Comparison Grid */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)',
                        border: '1px solid',
                        borderColor: 'divider',
                        mb: 2,
                      }}
                    >
                      {/* Current */}
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                          Current Allocation
                        </Typography>
                        <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            CPU Req: <strong>{rec.currentCpuRequest}</strong> (Lim: {rec.currentCpuLimit})
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            Mem Req: <strong>{rec.currentMemoryRequest}</strong> (Lim: {rec.currentMemoryLimit})
                          </Typography>
                        </Box>
                      </Box>

                      {/* Recommended */}
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                          Recommended Right-Size
                        </Typography>
                        <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#10b981' }}>
                            CPU Req: <strong>{rec.recommendedCpuRequest}</strong> (Lim: {rec.recommendedCpuLimit})
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#10b981' }}>
                            Mem Req: <strong>{rec.recommendedMemoryRequest}</strong> (Lim: {rec.recommendedMemoryLimit})
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Action Bar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={`Risk: ${rec.riskLevel}`}
                          size="small"
                          color={rec.riskLevel === 'LOW' ? 'success' : rec.riskLevel === 'MEDIUM' ? 'warning' : 'error'}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Confidence: {rec.confidenceScore}%
                        </Typography>
                      </Box>

                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        disabled={applyingRecId === rec.id}
                        onClick={() => handleApplyRecommendation(rec)}
                        startIcon={
                          applyingRecId === rec.id ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <AutoFixHighRoundedIcon />
                          )
                        }
                        sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                      >
                        {applyingRecId === rec.id ? 'Applying Patch...' : 'Apply Right-Sizing Patch'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        )}

        {/* TAB 1: Top Workload Spenders */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search workloads by name, namespace, or kind..."
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
              />
            </Box>

            <Card
              variant="outlined"
              sx={{
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Workload</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Namespace</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Replicas</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>CPU (Req / Used)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Memory (Req / Used)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cost / Mo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Waste / Mo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Efficiency</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredWorkloads.map((w: WorkloadCostBreakdown) => (
                    <TableRow key={`${w.namespace}-${w.kind}-${w.name}`} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip label={w.kind.slice(0, 3)} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                          {w.name}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{w.namespace}</TableCell>
                      <TableCell>{w.replicas}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {w.cpuRequestedCores}c / {w.cpuUsedCores}c
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {w.memoryRequestedGiB}G / {w.memoryUsedGiB}G
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>${w.monthlyCost.toFixed(2)}</TableCell>
                      <TableCell sx={{ color: w.wastedMonthlyCost > 15 ? 'warning.main' : 'text.secondary' }}>
                        ${w.wastedMonthlyCost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${w.efficiencyScore}%`}
                          size="small"
                          color={w.efficiencyScore > 75 ? 'success' : w.efficiencyScore > 40 ? 'warning' : 'error'}
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </Box>
        )}

        {/* TAB 2: Namespace Cost Breakdown */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Namespace Spend & Resource Allocation
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {finOps?.namespaces.map((ns) => (
                <Card
                  key={ns.namespace}
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {ns.namespace}
                      </Typography>
                      <Chip
                        label={`${ns.workloadCount} workloads`}
                        size="small"
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        ${ns.monthlyCost.toFixed(2)} / mo
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#f59e0b', display: 'block' }}>
                        waste: ${ns.wastedMonthlyCost.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={ns.sharePercentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#10b981' },
                    }}
                  />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {ns.sharePercentage}% of total cluster spend
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                      {ns.cpuRequestedCores} vCPU · {ns.memoryRequestedGiB} GiB
                    </Typography>
                  </Box>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Drawer Footer */}
      {!embedded && (
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            bgcolor: isDark ? '#0f172a' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Rates: ${customRates.cpuPerCoreHour}/vCPU-hr · ${customRates.memoryPerGiBHour}/GiB-hr
          </Typography>
          <Button size="small" variant="outlined" onClick={onClose} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </Box>
      )}
    </>
  );

  if (embedded) {
    return (
      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {bodyContent}
      </Paper>
    );
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
          },
        },
        paper: {
          sx: {
            width: { xs: '100%', sm: 750, md: 900 },
            bgcolor: isDark ? '#090d16' : '#f8fafc',
            borderLeft: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            boxShadow: isDark ? '-8px 0 32px rgba(0,0,0,0.6)' : '-8px 0 24px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {bodyContent}
    </Drawer>
  );
}
