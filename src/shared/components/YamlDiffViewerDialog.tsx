'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Switch,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  CircularProgress,
  useTheme,
  Divider,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded';
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import ViewColumnRoundedIcon from '@mui/icons-material/ViewColumnRounded';
import ViewStreamRoundedIcon from '@mui/icons-material/ViewStreamRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import {
  computeLineDiff,
  calculateDiffSummary,
  sanitizeKubernetesYaml,
  generateUnifiedPatch,
} from '../utils/yaml-diff';
import { K8sRolloutRevision } from '../types/dashboard.types';
import { copyTextToClipboard } from '../utils/clipboard';

export interface YamlDiffViewerDialogProps {
  open: boolean;
  onClose: () => void;
  resourceName: string;
  resourceType?: string;
  namespace: string;
  revisions?: K8sRolloutRevision[];
  currentYaml?: string;
  previousYaml?: string;
  title?: string;
  onRollback?: (revision: number) => Promise<void> | void;
  rollbackLoading?: boolean;
}

export default function YamlDiffViewerDialog({
  open,
  onClose,
  resourceName,
  resourceType = 'Deployment',
  namespace,
  revisions = [],
  currentYaml = '',
  previousYaml = '',
  title,
  onRollback,
  rollbackLoading = false,
}: YamlDiffViewerDialogProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [maximized, setMaximized] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [sanitizeMetadata, setSanitizeMetadata] = useState<boolean>(true);
  const [copiedPatch, setCopiedPatch] = useState<boolean>(false);

  // Revision Selection (Defaults to latest two revisions if available)
  const defaultRevB = revisions.length > 0 ? revisions[0].revision : 2;
  const defaultRevA = revisions.length > 1 ? revisions[1].revision : revisions.length > 0 ? revisions[0].revision : 1;

  const [selectedRevA, setSelectedRevA] = useState<number>(defaultRevA);
  const [selectedRevB, setSelectedRevB] = useState<number>(defaultRevB);

  // Sync selected revisions if revisions prop updates
  React.useEffect(() => {
    if (revisions.length > 0) {
      setSelectedRevB(revisions[0].revision);
      setSelectedRevA(revisions.length > 1 ? revisions[1].revision : revisions[0].revision);
    }
  }, [revisions]);

  // Determine YAML A (Old / Base) and YAML B (New / Target)
  const rawYamlA = useMemo(() => {
    if (revisions.length > 0) {
      const revObj = revisions.find((r) => r.revision === selectedRevA);
      if (revObj?.manifestYaml) return revObj.manifestYaml;
    }
    return previousYaml || currentYaml;
  }, [revisions, selectedRevA, previousYaml, currentYaml]);

  const rawYamlB = useMemo(() => {
    if (revisions.length > 0) {
      const revObj = revisions.find((r) => r.revision === selectedRevB);
      if (revObj?.manifestYaml) return revObj.manifestYaml;
    }
    return currentYaml || previousYaml;
  }, [revisions, selectedRevB, currentYaml, previousYaml]);

  // Sanitize YAML if enabled
  const processedYamlA = useMemo(() => {
    return sanitizeMetadata ? sanitizeKubernetesYaml(rawYamlA) : rawYamlA;
  }, [rawYamlA, sanitizeMetadata]);

  const processedYamlB = useMemo(() => {
    return sanitizeMetadata ? sanitizeKubernetesYaml(rawYamlB) : rawYamlB;
  }, [rawYamlB, sanitizeMetadata]);

  // Calculate Diff
  const diffLines = useMemo(() => {
    return computeLineDiff(processedYamlA, processedYamlB);
  }, [processedYamlA, processedYamlB]);

  const summary = useMemo(() => {
    return calculateDiffSummary(diffLines);
  }, [diffLines]);

  const handleCopyPatch = async () => {
    const patch = generateUnifiedPatch(
      `${resourceName}-rev#${selectedRevA}.yaml`,
      `${resourceName}-rev#${selectedRevB}.yaml`,
      diffLines
    );
    await copyTextToClipboard(patch);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const handleDownloadPatch = () => {
    const patch = generateUnifiedPatch(
      `${resourceName}-rev#${selectedRevA}.yaml`,
      `${resourceName}-rev#${selectedRevB}.yaml`,
      diffLines
    );
    const blob = new Blob([patch], { type: 'text/x-diff;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${resourceName}-rev${selectedRevA}-vs-rev${selectedRevB}.patch`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRollbackClick = async () => {
    if (onRollback) {
      await onRollback(selectedRevA);
    }
  };

  // Color variables for dark/light themes
  const addedBg = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.18)';
  const addedBorder = isDark ? 'rgba(34, 197, 94, 0.4)' : '#16a34a';
  const addedText = isDark ? '#4ade80' : '#15803d';

  const removedBg = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.18)';
  const removedBorder = isDark ? 'rgba(239, 68, 68, 0.4)' : '#dc2626';
  const removedText = isDark ? '#f87171' : '#b91c1c';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maximized ? false : 'lg'}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            width: maximized ? '98vw' : '92vw',
            maxWidth: maximized ? '98vw' : '1240px',
            height: maximized ? '95vh' : '86vh',
            maxHeight: maximized ? '95vh' : '86vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: isDark ? '#090d16' : '#ffffff',
            backgroundImage: 'none',
            borderRadius: maximized ? 1 : 3,
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
          p: 2,
          px: 3,
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
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.1)',
              color: isDark ? '#38bdf8' : '#0284c7',
            }}
          >
            <CompareArrowsRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {title || `GitOps Time Machine: ${resourceType} / ${resourceName}`}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Namespace: <b>{namespace}</b> • Visual YAML Diff & Historical Change Timeline
            </Typography>
          </Box>
        </Box>

        {/* Header Right Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={copiedPatch ? 'Patch Copied!' : 'Copy Unified Patch'}>
            <Button
              size="small"
              variant="outlined"
              color={copiedPatch ? 'success' : 'inherit'}
              startIcon={copiedPatch ? <CheckCircleRoundedIcon /> : <ContentCopyRoundedIcon />}
              onClick={handleCopyPatch}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
            >
              {copiedPatch ? 'Copied' : 'Copy Patch'}
            </Button>
          </Tooltip>

          <Tooltip title="Download .patch file">
            <IconButton size="small" onClick={handleDownloadPatch}>
              <FileDownloadRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={maximized ? 'Restore Dialog' : 'Maximize'}>
            <IconButton size="small" onClick={() => setMaximized(!maximized)}>
              {maximized ? <FullscreenExitRoundedIcon fontSize="small" /> : <FullscreenRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Control Toolbar */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          bgcolor: isDark ? '#0b101c' : '#f1f5f9',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Revisions Selectors */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
            Base (Old):
          </Typography>
          <Select
            size="small"
            value={selectedRevA}
            onChange={(e) => setSelectedRevA(Number(e.target.value))}
            sx={{
              height: 32,
              fontSize: '0.82rem',
              fontWeight: 700,
              bgcolor: isDark ? '#141a29' : '#ffffff',
            }}
          >
            {revisions.length > 0 ? (
              revisions.map((r) => (
                <MenuItem key={r.revision} value={r.revision}>
                  Rev #{r.revision} {r.isCurrent ? '(Current)' : ''} — {r.timestamp}
                </MenuItem>
              ))
            ) : (
              <MenuItem value={1}>Rev #1 (Base)</MenuItem>
            )}
          </Select>

          <CompareArrowsRoundedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />

          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
            Target (New):
          </Typography>
          <Select
            size="small"
            value={selectedRevB}
            onChange={(e) => setSelectedRevB(Number(e.target.value))}
            sx={{
              height: 32,
              fontSize: '0.82rem',
              fontWeight: 700,
              bgcolor: isDark ? '#141a29' : '#ffffff',
            }}
          >
            {revisions.length > 0 ? (
              revisions.map((r) => (
                <MenuItem key={r.revision} value={r.revision}>
                  Rev #{r.revision} {r.isCurrent ? '(Current)' : ''} — {r.timestamp}
                </MenuItem>
              ))
            ) : (
              <MenuItem value={2}>Rev #2 (Target)</MenuItem>
            )}
          </Select>
        </Box>

        {/* Diff Stats & View Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Summary Badges */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {summary.identical ? (
              <Chip
                icon={<CheckCircleRoundedIcon sx={{ fontSize: '14px !important' }} />}
                label="Identical / No Drift"
                size="small"
                color="success"
                sx={{ fontWeight: 700, fontSize: '0.72rem', height: 24 }}
              />
            ) : (
              <>
                <Chip
                  label={`+${summary.additions} added`}
                  size="small"
                  sx={{
                    bgcolor: addedBg,
                    color: addedText,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    height: 24,
                  }}
                />
                <Chip
                  label={`-${summary.deletions} removed`}
                  size="small"
                  sx={{
                    bgcolor: removedBg,
                    color: removedText,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    height: 24,
                  }}
                />
              </>
            )}
          </Box>

          <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

          {/* Clean Metadata Toggle */}
          <Tooltip title="Hide transient metadata (managedFields, resourceVersion, uid, timestamps, status)">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={sanitizeMetadata}
                  onChange={(e) => setSanitizeMetadata(e.target.checked)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TuneRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Sanitize K8s Metadata
                  </Typography>
                </Box>
              }
              sx={{ m: 0 }}
            />
          </Tooltip>

          {/* View Mode Toggle */}
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            sx={{ height: 28 }}
          >
            <ToggleButton value="split" sx={{ px: 1, py: 0.25 }}>
              <Tooltip title="Split Side-by-Side View">
                <ViewColumnRoundedIcon sx={{ fontSize: 16 }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="unified" sx={{ px: 1, py: 0.25 }}>
              <Tooltip title="Unified Inline View">
                <ViewStreamRoundedIcon sx={{ fontSize: 16 }} />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Revision Change Cause Banner */}
      {revisions.length > 0 && (
        <Box
          sx={{
            px: 3,
            py: 1,
            bgcolor: isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(2, 132, 199, 0.04)',
            borderBottom: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
            <HistoryRoundedIcon sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              <b>Rev #{selectedRevB}:</b>{' '}
              {revisions.find((r) => r.revision === selectedRevB)?.changeCause || 'No change cause documented'}
            </Typography>
          </Box>
          {onRollback && selectedRevA !== selectedRevB && (
            <Button
              size="small"
              variant="contained"
              color="warning"
              disabled={rollbackLoading}
              onClick={handleRollbackClick}
              startIcon={
                rollbackLoading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <RestoreRoundedIcon fontSize="small" />
                )
              }
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0.4, px: 1.5 }}
            >
              Rollback to Rev #{selectedRevA}
            </Button>
          )}
        </Box>
      )}

      {/* Diff Content Body */}
      <DialogContent
        sx={{
          p: 0,
          bgcolor: isDark ? '#050811' : '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.82rem',
        }}
      >
        {summary.identical ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 4,
            }}
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 48, color: 'success.main', mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              No Differences Detected
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 450, textAlign: 'center', mt: 0.5 }}>
              The manifests for Revision #{selectedRevA} and Revision #{selectedRevB} are identical in configuration.
            </Typography>
          </Box>
        ) : viewMode === 'split' ? (
          // Split Side-by-Side Diff View
          <Box sx={{ display: 'flex', minWidth: '100%', minHeight: '100%' }}>
            {/* Left Column: Old Revision (Rev A) */}
            <Box
              sx={{
                flex: 1,
                borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
                overflowX: 'auto',
              }}
            >
              <Box
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  px: 2,
                  py: 0.75,
                  bgcolor: isDark ? '#0e1320' : '#e2e8f0',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                  BASE: Rev #{selectedRevA}
                </Typography>
              </Box>
              <Box sx={{ py: 1 }}>
                {diffLines.map((line, idx) => {
                  if (line.type === 'added') return null; // Only show base or removed lines
                  const isRemoved = line.type === 'removed';
                  return (
                    <Box
                      key={`left-${idx}`}
                      sx={{
                        display: 'flex',
                        bgcolor: isRemoved ? removedBg : 'transparent',
                        borderLeft: isRemoved ? `3px solid ${removedBorder}` : '3px solid transparent',
                        px: 1,
                        py: 0.15,
                        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          userSelect: 'none',
                          color: 'text.disabled',
                          textAlign: 'right',
                          pr: 1.5,
                          fontSize: '0.75rem',
                        }}
                      >
                        {line.oldLineNumber || ''}
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          width: 16,
                          userSelect: 'none',
                          color: isRemoved ? removedText : 'transparent',
                          fontWeight: 700,
                        }}
                      >
                        {isRemoved ? '-' : ' '}
                      </Box>
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: isRemoved ? removedText : 'text.primary',
                          whiteSpace: 'pre',
                        }}
                      >
                        {line.content}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Right Column: New Revision (Rev B) */}
            <Box sx={{ flex: 1, overflowX: 'auto' }}>
              <Box
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  px: 2,
                  py: 0.75,
                  bgcolor: isDark ? '#0e1320' : '#e2e8f0',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                  TARGET: Rev #{selectedRevB}
                </Typography>
              </Box>
              <Box sx={{ py: 1 }}>
                {diffLines.map((line, idx) => {
                  if (line.type === 'removed') return null; // Only show target or added lines
                  const isAdded = line.type === 'added';
                  return (
                    <Box
                      key={`right-${idx}`}
                      sx={{
                        display: 'flex',
                        bgcolor: isAdded ? addedBg : 'transparent',
                        borderLeft: isAdded ? `3px solid ${addedBorder}` : '3px solid transparent',
                        px: 1,
                        py: 0.15,
                        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          userSelect: 'none',
                          color: 'text.disabled',
                          textAlign: 'right',
                          pr: 1.5,
                          fontSize: '0.75rem',
                        }}
                      >
                        {line.newLineNumber || ''}
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          width: 16,
                          userSelect: 'none',
                          color: isAdded ? addedText : 'transparent',
                          fontWeight: 700,
                        }}
                      >
                        {isAdded ? '+' : ' '}
                      </Box>
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: isAdded ? addedText : 'text.primary',
                          whiteSpace: 'pre',
                        }}
                      >
                        {line.content}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        ) : (
          // Unified Inline Diff View
          <Box sx={{ py: 1, minWidth: '100%' }}>
            {diffLines.map((line, idx) => {
              const isAdded = line.type === 'added';
              const isRemoved = line.type === 'removed';
              const rowBg = isAdded ? addedBg : isRemoved ? removedBg : 'transparent';
              const rowBorder = isAdded ? addedBorder : isRemoved ? removedBorder : 'transparent';
              const rowColor = isAdded ? addedText : isRemoved ? removedText : 'text.primary';

              return (
                <Box
                  key={`uni-${idx}`}
                  sx={{
                    display: 'flex',
                    bgcolor: rowBg,
                    borderLeft: `3px solid ${rowBorder}`,
                    px: 1,
                    py: 0.15,
                    '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      userSelect: 'none',
                      color: 'text.disabled',
                      textAlign: 'right',
                      pr: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    {line.oldLineNumber || ''}
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      userSelect: 'none',
                      color: 'text.disabled',
                      textAlign: 'right',
                      pr: 1.5,
                      fontSize: '0.75rem',
                    }}
                  >
                    {line.newLineNumber || ''}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      width: 18,
                      userSelect: 'none',
                      color: rowColor,
                      fontWeight: 700,
                    }}
                  >
                    {isAdded ? '+' : isRemoved ? '-' : ' '}
                  </Box>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: rowColor,
                      whiteSpace: 'pre',
                    }}
                  >
                    {line.content}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions
        sx={{
          px: 3,
          py: 1.5,
          bgcolor: isDark ? '#0f1422' : '#f8fafc',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Tip: Press <b>ESC</b> to close. Rollbacks are safely applied as progressive zero-downtime rolling updates.
          </Typography>
        </Box>
        <Button onClick={onClose} sx={{ fontWeight: 700, color: 'text.secondary' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
