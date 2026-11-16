'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// Import Xterm.js styles globally in the client bundle
import '@xterm/xterm/css/xterm.css';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

export interface TerminalWindowProps {
  open: boolean;
  onClose: () => void;
  resourceName: string;
  resourceType: 'pod' | 'node';
  clusterId: string;
  namespace?: string;
}

export function TerminalWindow({
  open,
  onClose,
  resourceName,
  resourceType,
  clusterId,
  namespace = 'default',
}: TerminalWindowProps) {
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [connected, setConnected] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const resizeHandlerRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!open || minimized) return;

    let termInstance: Terminal | null = null;
    let fitAddonInstance: FitAddon | null = null;
    let ws: WebSocket;

    const initTerminal = async () => {
      // Dynamically load browser-only Xterm module to prevent Next.js SSR document reference errors
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      termInstance = new Terminal({
        cursorBlink: true,
        fontFamily: 'monospace',
        fontSize: 13,
        theme: {
          background: '#0a0e17', // premium deep dark blue-black
          foreground: '#e2e8f0', // slate-200
          cursor: '#38bdf8',     // sky-400
        },
      });

      fitAddonInstance = new FitAddon();
      termInstance.loadAddon(fitAddonInstance);

      if (terminalRef.current) {
        termInstance.open(terminalRef.current);
        fitAddonInstance.fit();
      }

      termInstance.writeln('\x1b[90mConnecting to live shell container...\x1b[0m');

      // Resolve WebSocket host: use NEXT_PUBLIC_BACKEND_URL if configured, otherwise fall back to browser origin host (ideal for Ingress deployments)
      let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      if (
        backendUrl === 'PLACEHOLDER_NEXT_PUBLIC_BACKEND_URL' ||
        backendUrl.includes('ykp-api') ||
        backendUrl.includes('svc.cluster.local')
      ) {
        backendUrl = '';
      }

      const wsHost = backendUrl ? backendUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : window.location.host;
      const protocol = backendUrl ? (backendUrl.startsWith('https') ? 'wss:' : 'ws:') : (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
      let wsUrl = `${protocol}//${wsHost}/api/clusters/${clusterId}`;
      if (resourceType === 'pod') {
        wsUrl += `/pods/${namespace}/${resourceName}/exec`;
      } else {
        wsUrl += `/nodes/${resourceName}/ssh`;
      }

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        termInstance?.writeln('\x1b[32m[OK] WebSocket link connected.\x1b[0m');
        
        // Trigger initial proposal size to backend to fit PTY to parent width
        const dims = fitAddonInstance?.proposeDimensions();
        if (dims) {
          ws.send(JSON.stringify({ resize: { cols: dims.cols, rows: dims.rows } }));
        }
      };

      ws.onmessage = (event) => {
        termInstance?.write(event.data);
      };

      ws.onerror = () => {
        termInstance?.writeln('\n\x1b[31m[ERROR] Connection failed.\x1b[0m');
      };

      ws.onclose = () => {
        setConnected(false);
        termInstance?.writeln('\n\x1b[90mSession closed by remote API server.\x1b[0m');
      };

      termInstance?.onData((data: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      const handleResize = () => {
        if (fitAddonInstance && termInstance) {
          fitAddonInstance.fit();
          const dims = fitAddonInstance.proposeDimensions();
          if (dims && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ resize: { cols: dims.cols, rows: dims.rows } }));
          }
        }
      };

      window.addEventListener('resize', handleResize);
      resizeHandlerRef.current = handleResize;
    };

    initTerminal();

    return () => {
      if (ws) ws.close();
      if (termInstance) termInstance.dispose();
      window.removeEventListener('resize', resizeHandlerRef.current);
    };
  }, [open, minimized, resourceName, resourceType, clusterId, namespace]);

  // Re-fit the canvas layout when maximize mode shifts
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => {
        resizeHandlerRef.current();
      }, 150);
    }
  }, [maximized, open, minimized]);

  if (!open) return null;

  // ── Minimized floating badge pill ────────────────────────────────────────
  if (minimized) {
    return (
      <Paper
        elevation={8}
        onClick={() => setMinimized(false)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1400,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2.5,
          py: 1.5,
          bgcolor: '#1e293b',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4,
          cursor: 'pointer',
          boxShadow: '0 12px 24px -10px rgba(0,0,0,0.6)',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            transform: 'translateY(-2px)',
          },
        }}
      >
        <TerminalIcon sx={{ color: '#38bdf8' }} />
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2 }}>
            Terminal: {resourceName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
            <FiberManualRecordIcon sx={{ color: '#34d399', fontSize: 10 }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600 }}>
              Session Active
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Expand Shell">
            <IconButton onClick={() => setMinimized(false)} size="small" sx={{ color: '#94a3b8', p: 0.5 }}>
              <OpenInFullIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close Shell">
            <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8', p: 0.5 }}>
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    );
  }

  return (
    <Dialog
      open={open && !minimized}
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
          },
        },
      }}
    >
      {/* ── Title bar header ── */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 3,
          py: 2,
          bgcolor: '#0f1422',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TerminalIcon sx={{ color: '#38bdf8', fontSize: 22 }} />
          <Box>
            <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>
              {resourceType === 'pod' ? 'Exec Shell' : 'Node SSH Shell'}: {resourceName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FiberManualRecordIcon
                sx={{ color: connected ? '#34d399' : '#94a3b8', fontSize: 10 }}
              />
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>
                {connected ? `Connected  ·  ${resourceType}  ·  ${namespace}` : 'Connecting…'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Minimize to Dock">
            <IconButton
              onClick={() => setMinimized(true)}
              size="small"
              sx={{ color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1.5, p: 0.6 }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={maximized ? 'Restore Window' : 'Maximize Window'}>
            <IconButton
              onClick={() => setMaximized((v) => !v)}
              size="small"
              sx={{ color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1.5, p: 0.6 }}
            >
              {maximized ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Close Session">
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1.5, p: 0.6 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      {/* ── Xterm.js Canvas Element ── */}
      <DialogContent
        dividers
        sx={{
          p: 0,
          bgcolor: '#0a0e17',
          borderBottom: 'none',
          borderTop: 'none',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          ref={terminalRef}
          sx={{
            flexGrow: 1,
            p: 0,
            minHeight: 320,
            maxHeight: maximized ? 'calc(100vh - 76px)' : 480,
            bgcolor: '#0a0e17',
            overflow: 'hidden',
            '& .xterm': {
              padding: '16px',
            },
            '& .xterm-viewport': {
              bgcolor: '#0a0e17 !important',
            },
            '& .xterm-screen': {
              bgcolor: '#0a0e17 !important',
            },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default TerminalWindow;
