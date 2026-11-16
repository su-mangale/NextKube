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
}: YamlEditorDialogProps) {
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
      onClose={onClose}
      maxWidth={maximized ? false : 'md'}
      fullWidth
      fullScreen={maximized}
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#0a0e17',
            backgroundImage: 'none',
            borderRadius: maximized ? 0 : 3,
            border: maximized ? 'none' : '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: '#0f1422',
          color: '#f0f6fc',
          px: 3,
          py: 2,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, pr: 2 }}>
          <CodeIcon sx={{ color: '#38bdf8', fontSize: 22, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                color: '#f8fafc',
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
                  color: '#8b949e',
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
                  color: secretDecoded ? '#38bdf8' : '#e2e8f0',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 1.5,
                  p: 0.6,
                  bgcolor: secretDecoded ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
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
              color: copied ? '#34d399' : '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 1.5,
              px: 1.2,
              py: 0.4,
              fontWeight: 650,
              fontSize: '0.78rem',
              textTransform: 'none',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.2)',
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
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 1.5,
                p: 0.6,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.2)',
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
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 1.5,
                p: 0.6,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.2)',
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
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.12)',
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

      <DialogContent sx={{ p: 0, bgcolor: '#0a0e17', overflow: 'hidden' }}>
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
              height: maximized ? 'calc(100vh - 140px)' : height,
              gap: 2,
            }}
          >
            <CircularProgress sx={{ color: '#38bdf8' }} />
            <Typography variant="caption" sx={{ color: '#8b949e', fontWeight: 600 }}>
              Loading YAML content...
            </Typography>
          </Box>
        ) : (
          <YamlIdeEditor
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            height={maximized ? 'calc(100vh - 140px)' : height}
            embedded
            hideHeader
          />
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          bgcolor: '#0f1422',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ color: '#8b949e', fontSize: '0.75rem' }}>
          {readOnly ? 'Read-only mode' : 'Press Save to reconcile modifications'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            onClick={onClose}
            disabled={saving || loading}
            sx={{
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'none',
              px: 2,
              '&:hover': {
                color: '#f8fafc',
                bgcolor: 'rgba(255,255,255,0.05)',
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
