'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  useTheme,
} from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { DraggablePaper } from './DraggablePaper';

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
  container?: string;
  minimized?: boolean;
  zIndex?: number;
  onMinimize?: () => void;
  onRestore?: () => void;
  onFocus?: () => void;
}

export function TerminalWindow({
  open,
  onClose,
  resourceName,
  resourceType,
  clusterId,
  namespace = 'default',
  container,
  minimized: controlledMinimized,
  zIndex,
  onMinimize,
  onFocus,
}: TerminalWindowProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [maximized, setMaximized] = useState(false);
  const [internalMinimized, setInternalMinimized] = useState(false);
  const [connected, setConnected] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const isMinimized = controlledMinimized !== undefined ? controlledMinimized : internalMinimized;

  const handleCopyAllOutput = async () => {
    try {
      let outputText = '';
      if (termInstanceRef.current) {
        const buffer = termInstanceRef.current.buffer.active;
        const lines: string[] = [];
        for (let i = 0; i < buffer.length; i++) {
          const line = buffer.getLine(i);
          if (line) {
            lines.push(line.translateToString(true));
          }
        }
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
          lines.pop();
        }
        outputText = lines.join('\n');
      }
      if (!outputText && termInstanceRef.current) {
        termInstanceRef.current.selectAll();
        outputText = termInstanceRef.current.getSelection();
        termInstanceRef.current.clearSelection();
      }
      if (outputText) {
        await navigator.clipboard.writeText(outputText);
        setCopiedOutput(true);
        setTimeout(() => setCopiedOutput(false), 2000);
      }
    } catch (e) {
      console.error('Failed to copy terminal output:', e);
    }
  };

  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
    } else {
      setInternalMinimized(true);
    }
  };

  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const resizeHandlerRef = useRef<() => void>(() => { });

  useEffect(() => {
    if (!open) return;

    let termInstance: Terminal | null = null;
    let fitAddonInstance: FitAddon | null = null;
    let ws: WebSocket;

    const initTerminal = async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      termInstance = new Terminal({
        cursorBlink: true,
        fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", monospace',
        fontSize: 13,
        lineHeight: 1.25,
        theme: isDark
          ? {
            background: '#0a0e17',
            foreground: '#e2e8f0',
            cursor: '#38bdf8',
          }
          : {
            background: '#ffffff',
            foreground: '#0f172a',
            cursor: '#0284c7',
          },
      });

      termInstanceRef.current = termInstance;
      fitAddonInstance = new FitAddon();
      fitAddonRef.current = fitAddonInstance;
      termInstance.loadAddon(fitAddonInstance);

      if (terminalRef.current) {
        terminalRef.current.innerHTML = '';
        termInstance.open(terminalRef.current);
        fitAddonInstance.fit();
      }

      termInstance.writeln('\x1b[90mConnecting to live container shell...\x1b[0m');

      let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      if (
        !backendUrl ||
        backendUrl === 'PLACEHOLDER_NEXT_PUBLIC_BACKEND_URL' ||
        backendUrl === 'http://localhost:8080' ||
        backendUrl.includes('localhost:8080') ||
        backendUrl.includes('ykp-api') ||
        backendUrl.includes('svc.cluster.local')
      ) {
        backendUrl = '';
      }

      const wsHost = backendUrl ? backendUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : window.location.host;
      const protocol = backendUrl
        ? (backendUrl.startsWith('https') ? 'wss:' : 'ws:')
        : (window.location.protocol === 'https:' ? 'wss:' : 'ws:');

      let wsUrl = `${protocol}//${wsHost}/api/clusters/${clusterId}`;
      if (resourceType === 'pod') {
        const queryParams = container ? `?container=${encodeURIComponent(container)}` : '';
        wsUrl += `/pods/${namespace}/${resourceName}/exec${queryParams}`;
      } else {
        wsUrl += `/nodes/${resourceName}/ssh`;
      }

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        termInstance?.writeln('\x1b[32m[OK] WebSocket link connected.\x1b[0m');

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

      setTimeout(() => fitAddonInstance?.fit(), 100);
    };

    initTerminal();

    return () => {
      if (ws) ws.close();
      if (termInstance) termInstance.dispose();
      termInstanceRef.current = null;
      window.removeEventListener('resize', resizeHandlerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resourceName, resourceType, clusterId, namespace, container]);

  // Dynamically update terminal theme on dark/light mode toggle
  useEffect(() => {
    if (termInstanceRef.current) {
      termInstanceRef.current.options.theme = isDark
        ? { background: '#0a0e17', foreground: '#e2e8f0', cursor: '#38bdf8' }
        : { background: '#ffffff', foreground: '#0f172a', cursor: '#0284c7' };
    }
  }, [isDark]);

  // Re-fit canvas layout and re-attach DOM if needed when restored or maximized
  useEffect(() => {
    if (open && !isMinimized) {
      if (terminalRef.current && termInstanceRef.current?.element) {
        if (!terminalRef.current.contains(termInstanceRef.current.element)) {
          terminalRef.current.innerHTML = '';
          terminalRef.current.appendChild(termInstanceRef.current.element);
        }
      }

      const timer1 = setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 50);

      const timer2 = setTimeout(() => {
        fitAddonRef.current?.fit();
        termInstanceRef.current?.focus();
        const dims = fitAddonRef.current?.proposeDimensions();
        if (dims && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ resize: { cols: dims.cols, rows: dims.rows } }));
        }
      }, 180);

      const termEl = terminalRef.current;
      let observer: ResizeObserver | null = null;
      if (termEl && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => {
          if (fitAddonRef.current) {
            fitAddonRef.current.fit();
            const term = termInstanceRef.current;
            if (term && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ resize: { cols: term.cols, rows: term.rows } }));
            }
          }
        });
        observer.observe(termEl);
      }

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        if (observer) observer.disconnect();
      };
    }
  }, [maximized, open, isMinimized]);

  // Only unmount when session is closed
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperComponent={DraggablePaper}
      maxWidth={maximized ? false : 'md'}
      fullWidth
      fullScreen={maximized}
      hideBackdrop={true}
      disableEnforceFocus={true}
      sx={
        isMinimized
          ? {
            pointerEvents: 'none !important',
            visibility: 'hidden !important',
            zIndex: -1,
          }
          : {
            zIndex: zIndex || 1310,
            pointerEvents: 'none',
            '& .MuiDialog-container': {
              pointerEvents: 'none',
            },
            '& .MuiPaper-root': {
              pointerEvents: 'auto',
            },
          }
      }
      slotProps={{
        backdrop: {
          sx: { display: 'none !important' },
        },
        paper: {
          onClick: onFocus,
          sx: {
            bgcolor: isDark ? '#0a0e17' : '#ffffff',
            backgroundImage: 'none',
            borderRadius: maximized ? 0 : 3,
            border: maximized ? 'none' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              : '0 25px 50px -12px rgba(15, 23, 42, 0.16)',
            overflow: 'hidden',
            visibility: isMinimized ? 'hidden !important' : 'visible !important',
            pointerEvents: isMinimized ? 'none !important' : 'auto !important',
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
          py: 1.75,
          bgcolor: isDark ? '#0f1422' : '#f8fafc',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TerminalIcon sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 22 }} />
          <Box>
            <Typography variant="h6" sx={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 800, fontSize: '0.98rem', lineHeight: 1.2 }}>
              {resourceType === 'pod' ? 'Pod Exec Shell' : 'Node SSH Shell'}: {resourceName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.3 }}>
              <FiberManualRecordIcon
                sx={{ color: connected ? '#22c55e' : '#eab308', fontSize: 9 }}
              />
              <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>
                {connected
                  ? `Connected  ·  ${resourceType}  ·  ${namespace}${container ? `  ·  container: ${container}` : ''}`
                  : `Connecting…${container ? ` [${container}]` : ''}`}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Tooltip title={copiedOutput ? 'Copied Output!' : 'Copy All Output'}>
            <IconButton
              onClick={handleCopyAllOutput}
              size="small"
              sx={{
                color: copiedOutput ? '#22c55e' : (isDark ? '#cbd5e1' : '#475569'),
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                borderRadius: 1.5,
                p: 0.6,
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                },
              }}
            >
              {copiedOutput ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Minimize to Dock">
            <IconButton
              onClick={handleMinimize}
              size="small"
              sx={{
                color: isDark ? '#cbd5e1' : '#475569',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                borderRadius: 1.5,
                p: 0.6,
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                },
              }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={maximized ? 'Restore Window' : 'Maximize Window'}>
            <IconButton
              onClick={() => setMaximized((v) => !v)}
              size="small"
              sx={{
                color: isDark ? '#cbd5e1' : '#475569',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                borderRadius: 1.5,
                p: 0.6,
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                },
              }}
            >
              {maximized ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Close Session">
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: isDark ? '#cbd5e1' : '#64748b',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
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

      {/* ── Xterm.js Canvas Element ── */}
      <DialogContent
        dividers
        sx={{
          p: 0,
          bgcolor: isDark ? '#0a0e17' : '#ffffff',
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
            minHeight: 340,
            height: maximized ? 'calc(100vh - 76px)' : '100%',
            maxHeight: maximized ? 'calc(100vh - 76px)' : 'none',
            bgcolor: isDark ? '#0a0e17' : '#ffffff',
            overflow: 'hidden',
            '& .xterm': {
              padding: '16px',
              height: '100%',
            },
            '& .xterm-viewport': {
              bgcolor: isDark ? '#0a0e17 !important' : '#ffffff !important',
            },
            '& .xterm-screen': {
              bgcolor: isDark ? '#0a0e17 !important' : '#ffffff !important',
            },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default TerminalWindow;
