'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  Paper,
  Divider,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import TerminalIcon from '@mui/icons-material/Terminal';
import ArticleIcon from '@mui/icons-material/Article';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { usePodDiagnosis } from '../api/dashboard.api';
import { copyToClipboard } from '../utils/clipboard';

export interface PodDiagnosticDialogProps {
  open: boolean;
  onClose: () => void;
  clusterId: string;
  namespace: string;
  podName: string;
  onOpenLogs?: (podName: string, namespace: string) => void;
  onOpenExec?: (podName: string, namespace: string) => void;
  onApplyFix?: (patchYaml: string, targetWorkload: any) => Promise<void>;
  onRestartPod?: (podName: string, namespace: string) => Promise<void>;
}

export function PodDiagnosticDialog({
  open,
  onClose,
  clusterId,
  namespace,
  podName,
  onOpenLogs,
  onOpenExec,
  onApplyFix,
  onRestartPod,
}: PodDiagnosticDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [copiedPatch, setCopiedPatch] = useState<boolean>(false);
  const [applyingFix, setApplyingFix] = useState<boolean>(false);
  const [fixSuccess, setFixSuccess] = useState<string | null>(null);

  const { data: report, isLoading, error, refetch } = usePodDiagnosis(
    clusterId,
    namespace,
    open ? podName : null
  );

  const handleCopyPatch = (text: string) => {
    copyToClipboard(text);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const handleApply = async () => {
    if (!report?.suggestedFix.patchYaml || !onApplyFix) return;
    setApplyingFix(true);
    try {
      await onApplyFix(report.suggestedFix.patchYaml, report.suggestedFix.targetWorkload);
      setFixSuccess('Suggested fix successfully applied to the cluster!');
      setTimeout(() => setFixSuccess(null), 4000);
    } catch {
      // Handled by parent
    } finally {
      setApplyingFix(false);
    }
  };

  const getSeverityIcon = (sev?: string) => {
    switch (sev) {
      case 'critical':
        return <ErrorOutlineIcon sx={{ color: '#ef4444', fontSize: 24 }} />;
      case 'warning':
        return <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 24 }} />;
      default:
        return <CheckCircleOutlineIcon sx={{ color: '#10b981', fontSize: 24 }} />;
    }
  };

  const getSeverityColor = (sev?: string) => {
    switch (sev) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#10b981';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: isDark ? '#0f172a' : '#ffffff',
            backgroundImage: 'none',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            border: `1px solid ${theme.palette.divider}`,
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* DIALOG HEADER */}
      <DialogTitle
        sx={{
          p: 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(248, 250, 252, 0.8)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.12)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                AI Pod Root-Cause Diagnostic
              </Typography>
              <Chip
                size="small"
                label="Automated SRE"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: 'rgba(139, 92, 246, 0.15)',
                  color: '#8b5cf6',
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Intelligent anomaly triage for {podName} ({namespace})
            </Typography>
          </Box>
        </Box>

        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* DIALOG CONTENT */}
      <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {isLoading && (
          <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={40} sx={{ color: '#8b5cf6' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Analyzing pod conditions, events, and container logs...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            Failed to complete diagnostic: {(error as Error).message}
          </Alert>
        )}

        {fixSuccess && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            {fixSuccess}
          </Alert>
        )}

        {report && (
          <>
            {/* ROOT CAUSE SUMMARY CARD */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                border: `1.5px solid ${alpha(getSeverityColor(report.severity), 0.35)}`,
                bgcolor: isDark
                  ? alpha(getSeverityColor(report.severity), 0.08)
                  : alpha(getSeverityColor(report.severity), 0.04),
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getSeverityIcon(report.severity)}
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    {report.rootCause}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={report.severity.toUpperCase()}
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    bgcolor: alpha(getSeverityColor(report.severity), 0.2),
                    color: getSeverityColor(report.severity),
                  }}
                />
              </Box>

              <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.primary' }}>
                {report.explanation}
              </Typography>
            </Paper>

            {/* DIAGNOSTIC EVIDENCE GRID */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>
                Triage Evidence & Telemetry
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Container & Exit Code</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, fontFamily: 'monospace' }}>
                    {report.evidence.containerName} · Exit Code: {report.evidence.exitCode ?? 'N/A'}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Termination Reason</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {report.evidence.terminationReason || 'Active / None'}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Configured Memory Limit</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, fontFamily: 'monospace' }}>
                    {report.evidence.memoryLimit || 'unlimited'}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Restart Count</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {report.evidence.restartCount ?? 0} restarts
                  </Typography>
                </Paper>
              </Box>

              {/* Warning Event callout */}
              {report.evidence.failedEvent && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    borderColor: 'warning.main',
                    bgcolor: isDark ? 'rgba(245, 158, 11, 0.05)' : 'rgba(245, 158, 11, 0.03)',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main', display: 'block', mb: 0.5 }}>
                    Kubernetes Event Warning:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {report.evidence.failedEvent}
                  </Typography>
                </Paper>
              )}

              {/* Relevant Log Snippet */}
              {report.evidence.relevantLogSnippet && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    Log Snippet around Failure:
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#090d16',
                      color: '#e2e8f0',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      lineHeight: 1.5,
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {report.evidence.relevantLogSnippet}
                  </Box>
                </Box>
              )}
            </Box>

            <Divider />

            {/* SUGGESTED ACTION & 1-CLICK REMEDIATION */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Recommended Remediation
                </Typography>
                {report.suggestedFix.patchYaml && (
                  <Button
                    size="small"
                    variant="text"
                    startIcon={copiedPatch ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    onClick={() => handleCopyPatch(report.suggestedFix.patchYaml!)}
                  >
                    {copiedPatch ? 'Copied' : 'Copy Patch'}
                  </Button>
                )}
              </Box>

              <Alert
                severity="info"
                icon={<AutoAwesomeIcon sx={{ color: '#8b5cf6' }} />}
                sx={{
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
                  borderColor: alpha('#8b5cf6', 0.2),
                }}
              >
                {report.suggestedFix.description}
              </Alert>

              {report.suggestedFix.patchYaml && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#090d16',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    lineHeight: 1.5,
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                  }}
                >
                  {report.suggestedFix.patchYaml}
                </Box>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      {/* DIALOG ACTIONS */}
      <DialogActions
        sx={{
          p: 2.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(248, 250, 252, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onOpenLogs && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ArticleIcon />}
              onClick={() => {
                onClose();
                onOpenLogs(podName, namespace);
              }}
            >
              Full Logs
            </Button>
          )}
          {onOpenExec && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<TerminalIcon />}
              onClick={() => {
                onClose();
                onOpenExec(podName, namespace);
              }}
            >
              Exec Shell
            </Button>
          )}
          {onRestartPod && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<RestartAltIcon />}
              onClick={() => onRestartPod(podName, namespace)}
            >
              Restart Pod
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => refetch()}>
            Re-Analyze
          </Button>
          {report?.suggestedFix.patchYaml && onApplyFix && (
            <Button
              size="small"
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              disabled={applyingFix}
              onClick={handleApply}
              sx={{
                bgcolor: '#8b5cf6',
                '&:hover': { bgcolor: '#7c3aed' },
              }}
            >
              {applyingFix ? 'Applying Fix...' : 'Apply Fix to Workload'}
            </Button>
          )}
          <Button size="small" variant="contained" onClick={onClose}>
            Done
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
