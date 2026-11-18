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
  TextField,
  InputAdornment,
  Tooltip,
  CircularProgress,
  useTheme,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  LinearProgress,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LockPersonRoundedIcon from '@mui/icons-material/LockPersonRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import {
  useSecurityPosture,
  checkRbacCanI,
  useRbacMatrix,
} from '../api/dashboard.api';
import {
  RbacCheckResult,
  SecuritySeverity,
  SecurityViolation,
} from '../types/dashboard.types';

export interface SecurityPostureDrawerProps {
  open: boolean;
  onClose: () => void;
  clusterId: string;
  namespaces?: string[];
}

export default function SecurityPostureDrawer({
  open,
  onClose,
  clusterId,
  namespaces = ['default', 'production', 'kube-system'],
}: SecurityPostureDrawerProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [activeTab, setActiveTab] = useState<number>(0);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | SecuritySeverity>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // RBAC "Can I do X?" tester state
  const [rbacSubjectKind, setRbacSubjectKind] = useState<'ServiceAccount' | 'User' | 'Group'>('ServiceAccount');
  const [rbacSubjectName, setRbacSubjectName] = useState<string>('default');
  const [rbacNamespace, setRbacNamespace] = useState<string>('default');
  const [rbacVerb, setRbacVerb] = useState<string>('get');
  const [rbacResource, setRbacResource] = useState<string>('pods');
  const [rbacTesting, setRbacTesting] = useState<boolean>(false);
  const [rbacResult, setRbacResult] = useState<RbacCheckResult | null>(null);

  const {
    data: posture,
    isLoading: isPostureLoading,
    isRefetching: isPostureRefetching,
    refetch: refetchPosture,
  } = useSecurityPosture(clusterId, { enabled: open });

  const {
    data: rbacMatrix,
    isLoading: isRbacLoading,
    refetch: refetchRbac,
  } = useRbacMatrix(clusterId, rbacNamespace, { enabled: open && activeTab === 1 });

  // Filtered violations
  const filteredViolations = useMemo(() => {
    if (!posture?.violations) return [];
    return posture.violations.filter((v) => {
      if (severityFilter !== 'ALL' && v.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          v.title.toLowerCase().includes(q) ||
          v.message.toLowerCase().includes(q) ||
          v.workloadName.toLowerCase().includes(q) ||
          v.namespace.toLowerCase().includes(q) ||
          v.ruleId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [posture?.violations, severityFilter, searchQuery]);

  // Execute RBAC "Can I do X?" test
  const handleTestRbac = async () => {
    setRbacTesting(true);
    setRbacResult(null);
    try {
      const res = await checkRbacCanI(clusterId, {
        subjectKind: rbacSubjectKind,
        subjectName: rbacSubjectName,
        namespace: rbacNamespace,
        verb: rbacVerb as any,
        resource: rbacResource,
      });
      setRbacResult(res);
    } catch {
      setRbacResult({
        allowed: false,
        reason: 'Error checking authorization API.',
        subject: rbacSubjectName,
        verb: rbacVerb,
        resource: rbacResource,
        namespace: rbacNamespace,
      });
    } finally {
      setRbacTesting(false);
    }
  };

  // Export report to CSV
  const handleExportCSV = () => {
    if (!posture) return;
    const headers = ['Rule_ID,CIS_Section,Severity,Category,Namespace,Workload,Kind,Container,Title,Message,Remediation'];
    const rows = (posture.violations || []).map((v) =>
      `"${v.ruleId}","${v.cisSection || ''}","${v.severity}","${v.category}","${v.namespace}","${v.workloadName}","${v.kind}","${v.containerName || ''}","${v.title}","${v.message.replace(/"/g, '""')}","${v.remediation.replace(/"/g, '""')}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NextKube-Security-CIS-${clusterId}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

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
            width: { xs: '100%', sm: 780, md: 950 },
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
              bgcolor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
            }}
          >
            <ShieldRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.2 }}>
              Security Posture & CIS Benchmark Audit
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Pod Security Standards (PSS) · CIS Benchmark compliance & RBAC policy analyzer
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh Telemetry">
            <IconButton
              size="small"
              onClick={() => {
                refetchPosture();
                refetchRbac();
              }}
              disabled={isPostureLoading || isPostureRefetching}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <RefreshRoundedIcon
                fontSize="small"
                sx={{
                  animation: isPostureLoading || isPostureRefetching ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Security Report (CSV)">
            <IconButton
              size="small"
              onClick={handleExportCSV}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <FileDownloadRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Loading Bar */}
      {(isPostureLoading || isPostureRefetching) && <LinearProgress color="error" sx={{ height: 2 }} />}

      {/* Drawer Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* KPI Top Cards */}
        {posture && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
            {/* CIS Security Score & Grade */}
            <Card
              variant="outlined"
              sx={{
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  CIS Security Score
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: getScoreColor(posture.score), mt: 0.5 }}>
                  {posture.score}
                  <Typography component="span" variant="subtitle2" sx={{ color: 'text.secondary', ml: 0.5 }}>
                    / 100
                  </Typography>
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                  {posture.scannedWorkloadsCount} workloads inspected
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  border: `2px solid ${getScoreColor(posture.score)}`,
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 900, color: getScoreColor(posture.score) }}>
                  {posture.grade}
                </Typography>
              </Box>
            </Card>

            {/* Severity Violations Count */}
            <Card
              variant="outlined"
              sx={{
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                p: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                Active Violations
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip
                  label={`${posture.criticalCount} Critical`}
                  size="small"
                  color="error"
                  variant="filled"
                  sx={{ height: 22, fontSize: '0.68rem', fontWeight: 800 }}
                />
                <Chip
                  label={`${posture.highCount} High`}
                  size="small"
                  color="warning"
                  variant="filled"
                  sx={{ height: 22, fontSize: '0.68rem', fontWeight: 800 }}
                />
                <Chip
                  label={`${posture.mediumCount} Med`}
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                />
                <Chip
                  label={`${posture.lowCount} Low`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: '0.68rem' }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                {posture.criticalCount + posture.highCount} require immediate remediation
              </Typography>
            </Card>

            {/* Category Health */}
            <Card
              variant="outlined"
              sx={{
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              {posture.categoryScores.slice(0, 2).map((cat) => (
                <Box key={cat.category}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {cat.category}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: getScoreColor(cat.score) }}>
                      {cat.score}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={cat.score}
                    sx={{
                      height: 5,
                      borderRadius: 2,
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': { bgcolor: getScoreColor(cat.score) },
                    }}
                  />
                </Box>
              ))}
            </Card>
          </Box>
        )}

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
            <Tab
              icon={<SecurityRoundedIcon fontSize="small" />}
              iconPosition="start"
              label={`CIS Benchmark Violations (${posture?.violations?.length || 0})`}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            />
            <Tab
              icon={<LockPersonRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="RBAC Policy Matrix & 'Can I do X?'"
              sx={{ fontWeight: 700, textTransform: 'none' }}
            />
          </Tabs>
        </Box>

        {/* TAB 0: CIS Benchmark Violations */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Filter Bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Search violations by title, workload, namespace, or rule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ flex: 1, minWidth: 260 }}
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

              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                  <Chip
                    key={sev}
                    label={sev}
                    size="small"
                    onClick={() => setSeverityFilter(sev)}
                    color={
                      severityFilter === sev
                        ? sev === 'CRITICAL'
                          ? 'error'
                          : sev === 'HIGH'
                            ? 'warning'
                            : sev === 'MEDIUM'
                              ? 'info'
                              : 'primary'
                        : 'default'
                    }
                    variant={severityFilter === sev ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 700, fontSize: '0.68rem', cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            {/* Violations List */}
            {filteredViolations.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 42, color: '#10b981', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  No Violations Detected
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No security issues found matching your current filter criteria.
                </Typography>
              </Box>
            ) : (
              filteredViolations.map((v: SecurityViolation) => (
                <Card
                  key={v.id}
                  variant="outlined"
                  sx={{
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                    borderColor:
                      v.severity === 'CRITICAL'
                        ? 'rgba(239, 68, 68, 0.3)'
                        : v.severity === 'HIGH'
                          ? 'rgba(245, 158, 11, 0.3)'
                          : isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.08)',
                    borderRadius: 2.5,
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={v.severity}
                          size="small"
                          color={v.severity === 'CRITICAL' ? 'error' : v.severity === 'HIGH' ? 'warning' : 'info'}
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                        />
                        {v.cisSection && (
                          <Chip
                            label={`CIS ${v.cisSection}`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem', fontFamily: 'monospace' }}
                          />
                        )}
                        <Chip
                          label={v.category}
                          size="small"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>
                        {v.namespace}/{v.workloadName} {v.containerName ? `(${v.containerName})` : ''}
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                      {v.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                      {v.message}
                    </Typography>

                    {/* Remediation Advice Box */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                        Remediation Guidance
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                        {v.remediation}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        )}

        {/* TAB 1: RBAC Policy Matrix & "Can I do X?" */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Interactive "Can I do X?" Tester Box */}
            <Card
              variant="outlined"
              sx={{
                p: 2.5,
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                borderRadius: 2.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                Interactive RBAC Tester: "Can Subject X perform Action Y on Resource Z?"
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                Executes Kubernetes authorization SubjectAccessReview against API RBAC rules
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr 1fr auto' }, gap: 1.5, alignItems: 'center' }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Subject Kind</InputLabel>
                  <Select
                    value={rbacSubjectKind}
                    label="Subject Kind"
                    onChange={(e) => setRbacSubjectKind(e.target.value as any)}
                  >
                    <MenuItem value="ServiceAccount">ServiceAccount</MenuItem>
                    <MenuItem value="User">User</MenuItem>
                    <MenuItem value="Group">Group</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  label="Subject Name"
                  value={rbacSubjectName}
                  onChange={(e) => setRbacSubjectName(e.target.value)}
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>Verb</InputLabel>
                  <Select
                    value={rbacVerb}
                    label="Verb"
                    onChange={(e) => setRbacVerb(e.target.value)}
                  >
                    <MenuItem value="get">get</MenuItem>
                    <MenuItem value="list">list</MenuItem>
                    <MenuItem value="watch">watch</MenuItem>
                    <MenuItem value="create">create</MenuItem>
                    <MenuItem value="update">update</MenuItem>
                    <MenuItem value="patch">patch</MenuItem>
                    <MenuItem value="delete">delete</MenuItem>
                    <MenuItem value="*">* (all verbs)</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Resource</InputLabel>
                  <Select
                    value={rbacResource}
                    label="Resource"
                    onChange={(e) => setRbacResource(e.target.value)}
                  >
                    <MenuItem value="pods">pods</MenuItem>
                    <MenuItem value="deployments">deployments</MenuItem>
                    <MenuItem value="services">services</MenuItem>
                    <MenuItem value="secrets">secrets</MenuItem>
                    <MenuItem value="configmaps">configmaps</MenuItem>
                    <MenuItem value="nodes">nodes</MenuItem>
                    <MenuItem value="*">* (all resources)</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Namespace</InputLabel>
                  <Select
                    value={rbacNamespace}
                    label="Namespace"
                    onChange={(e) => setRbacNamespace(e.target.value)}
                  >
                    <MenuItem value="*">* (Cluster-wide)</MenuItem>
                    {namespaces.map((ns) => (
                      <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleTestRbac}
                  disabled={rbacTesting}
                  startIcon={rbacTesting ? <CircularProgress size={16} color="inherit" /> : <PlayArrowRoundedIcon />}
                  sx={{ fontWeight: 700, textTransform: 'none', height: 40 }}
                >
                  {rbacTesting ? 'Testing...' : 'Can I?'}
                </Button>
              </Box>

              {/* Result Verdict Card */}
              {rbacResult && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: rbacResult.allowed
                      ? isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5'
                      : isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                    border: '1px solid',
                    borderColor: rbacResult.allowed ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {rbacResult.allowed ? (
                      <CheckCircleRoundedIcon sx={{ color: '#10b981', fontSize: 28 }} />
                    ) : (
                      <ErrorOutlineRoundedIcon sx={{ color: '#ef4444', fontSize: 28 }} />
                    )}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: rbacResult.allowed ? '#10b981' : '#ef4444' }}>
                        {rbacResult.allowed ? 'ACTION ALLOWED' : 'ACTION DENIED'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {rbacResult.reason}
                      </Typography>
                    </Box>
                  </Box>

                  {rbacResult.grantingRole && (
                    <Chip
                      label={`Granted by ${rbacResult.grantingRole}`}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              )}
            </Card>

            {/* Visual RBAC Matrix Table */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Cluster Role & Binding Permission Matrix
              </Typography>

              {isRbacLoading ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
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
                        <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Kind</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Role / ClusterRole</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Binding</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Granted Permissions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(rbacMatrix || []).map((entry) => (
                        <TableRow key={entry.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {entry.subjectName}
                          </TableCell>
                          <TableCell>
                            <Chip label={entry.subjectKind} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{entry.namespace}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {entry.roleKind}/{entry.roleName}
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{entry.bindingName}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {entry.permissions.map((p, idx) => (
                                <Chip
                                  key={idx}
                                  label={`${p.resource}: [${p.verbs.join(', ')}]`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.62rem', fontFamily: 'monospace' }}
                                />
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Drawer Footer */}
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
          Compliance: CIS Kubernetes Benchmark v1.8 · NSA/CISA Kubernetes Hardening Guide
        </Typography>
        <Button size="small" variant="outlined" onClick={onClose} sx={{ textTransform: 'none' }}>
          Close
        </Button>
      </Box>
    </Drawer>
  );
}
