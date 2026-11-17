'use client';

import React, { useState } from 'react';
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
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import YamlIdeEditor from './YamlIdeEditor';
import { DraggablePaper } from './DraggablePaper';

export interface YamlEditorDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => Promise<void> | void;
  subtitle?: string;
  saveButtonText?: string;
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  readOnly?: boolean;
  filename?: string;
  height?: string | number;
  showSecretToggle?: boolean;
  secretDecoded?: boolean;
  onToggleSecretDecode?: () => void;
  initialMaximized?: boolean;
  zIndex?: number;
  onFocus?: () => void;
}

export default function YamlEditorDialog({
  open,
  onClose,
  title,
  value,
  onChange,
  onSave,
  subtitle,
  saveButtonText = 'Save Changes',
  loading = false,
  saving = false,
  error = null,
  readOnly = false,
  filename = 'manifest',
  height = '480px',
  showSecretToggle = false,
  secretDecoded = false,
  onToggleSecretDecode,
  initialMaximized = false,
  zIndex,
  onFocus,
}: YamlEditorDialogProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [maximized, setMaximized] = useState(initialMaximized);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy YAML to clipboard', err);
    }
  };

  const handleDownload = () => {
    try {
      if (typeof window !== 'undefined') {
        const blob = new Blob([value], { type: 'text/yaml;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename.endsWith('.yaml') || filename.endsWith('.yml') ? filename : `${filename}.yaml`}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download YAML file', err);
    }
  };

  const handleSaveClick = async () => {
    if (onSave) {
      await onSave(value);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }}
      PaperComponent={DraggablePaper}
      maxWidth={maximized ? false : 'md'}
      fullWidth
      fullScreen={maximized}
      hideBackdrop={true}
      disableEnforceFocus={true}
      sx={{
        zIndex: zIndex || 1315,
        pointerEvents: 'none',
        '& .MuiDialog-container': {
          pointerEvents: 'none',
        },
        '& .MuiPaper-root': {
          pointerEvents: 'auto',
        },
      }}
      slotProps={{
        paper: {
          onClick: onFocus,
          onMouseDown: onFocus,
          sx: {
            bgcolor: isDark ? '#0a0e17' : '#ffffff',
            backgroundImage: 'none',
            borderRadius: maximized ? 0 : 3,
            border: maximized ? 'none' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              : '0 25px 50px -12px rgba(15, 23, 42, 0.16)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: isDark ? '#0f1422' : '#f8fafc',
          color: isDark ? '#f0f6fc' : '#0f172a',
          px: 3,
          py: 2,
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, pr: 2 }}>
          <CodeIcon sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 22, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                color: isDark ? '#f8fafc' : '#0f172a',
                fontWeight: 800,
                fontSize: '1rem',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? '#8b949e' : '#64748b',
                  fontSize: '0.75rem',
                  display: 'block',
                  mt: 0.25,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {showSecretToggle && onToggleSecretDecode && (
            <Tooltip title={secretDecoded ? 'Mask Secret' : 'Unmask Secret'}>
              <IconButton
                size="small"
                onClick={onToggleSecretDecode}
                sx={{
                  color: secretDecoded ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#e2e8f0' : '#475569'),
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                  borderRadius: 1.5,
                  p: 0.6,
                  bgcolor: secretDecoded ? (isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)') : 'transparent',
                }}
              >
                {secretDecoded ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}

          <Button
            size="small"
            startIcon={<ContentCopyIcon fontSize="small" />}
            onClick={handleCopy}
            sx={{
              color: copied ? '#10b981' : (isDark ? '#e2e8f0' : '#475569'),
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
              borderRadius: 1.5,
              px: 1.2,
              py: 0.4,
              fontWeight: 650,
              fontSize: '0.78rem',
              textTransform: 'none',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#94a3b8',
              },
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Tooltip title="Download .yaml">
            <IconButton
              size="small"
              onClick={handleDownload}
              sx={{
                color: isDark ? '#e2e8f0' : '#475569',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                borderRadius: 1.5,
                p: 0.6,
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#94a3b8',
                },
              }}
            >
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={maximized ? 'Restore Window' : 'Maximize Window'}>
            <IconButton
              size="small"
              onClick={() => setMaximized(!maximized)}
              sx={{
                color: isDark ? '#e2e8f0' : '#475569',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                borderRadius: 1.5,
                p: 0.6,
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#94a3b8',
                },
              }}
            >
              {maximized ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Close Window">
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: isDark ? '#e2e8f0' : '#64748b',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                borderRadius: 1.5,
                p: 0.6,
                '&:hover': {
                  bgcolor: 'rgba(239, 68, 68, 0.15)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

        <DialogContent
          sx={{
            p: 0,
            bgcolor: isDark ? '#0a0e17' : '#ffffff',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            height: maximized ? 'calc(100vh - 140px)' : height,
            minHeight: height,
          }}
        >
          {error && (
            <Box sx={{ p: 1.5, bgcolor: 'rgba(239, 68, 68, 0.12)', borderBottom: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <Alert severity="error" sx={{ bgcolor: 'transparent', color: '#fca5a5', py: 0 }}>
                {error}
              </Alert>
            </Box>
          )}

          {loading ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: maximized ? 'calc(100vh - 140px)' : '100%',
                flexGrow: 1,
                gap: 2,
              }}
            >
                <CircularProgress sx={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                <Typography variant="caption" sx={{ color: isDark ? '#8b949e' : '#64748b', fontWeight: 600 }}>
                  Loading YAML content...
                </Typography>
            </Box>
          ) : (
            <YamlIdeEditor
              value={value}
              onChange={onChange}
              readOnly={readOnly}
              height="100%"
              embedded
              hideHeader
            />
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            bgcolor: isDark ? '#0f1422' : '#f8fafc',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
            justifyContent: 'space-between',
          }}
        >
            <Typography variant="caption" sx={{ color: isDark ? '#8b949e' : '#64748b', fontSize: '0.75rem' }}>
              {readOnly ? 'Read-only mode' : 'Press Save to reconcile modifications'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                onClick={onClose}
                disabled={saving || loading}
                sx={{
                  fontWeight: 700,
                  color: isDark ? '#94a3b8' : '#64748b',
                  textTransform: 'none',
                  px: 2,
                  '&:hover': {
                    color: isDark ? '#f8fafc' : '#0f172a',
                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
                  },
                }}
              >
                Cancel
              </Button>

              {!readOnly && (
                <Button
                  onClick={handleSaveClick}
                  variant="contained"
                  color="primary"
                  disabled={saving || loading}
                  startIcon={saving && <CircularProgress size={16} color="inherit" />}
                  sx={{
                    fontWeight: 750,
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 2.5,
                  }}
                >
                  {saving ? 'Saving...' : saveButtonText}
                </Button>
              )}
            </Box>
        </DialogActions>
    </Dialog>
  );
}
