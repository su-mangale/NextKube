'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Button,
  useTheme,
} from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import DnsIcon from '@mui/icons-material/Dns';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import LanOutlinedIcon from '@mui/icons-material/LanOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import CodeIcon from '@mui/icons-material/Code';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { DraggablePaper } from './DraggablePaper';

import '@xterm/xterm/css/xterm.css';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

export interface KubectlTerminalDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  clusterId: string;
  zIndex?: number;
  onFocus?: () => void;
}

// Light theme inspired by VS Code Light+ / GitHub Light
const lightTerminalTheme = {
  background: '#ffffff',
  foreground: '#0f172a', // slate-900
  cursor: '#0284c7', // sky-600
  cursorAccent: '#ffffff',
  selectionBackground: '#bae6fd',
  selectionForeground: '#0f172a',
  black: '#1e293b',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0284c7',
  white: '#64748b',
  brightBlack: '#475569',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#06b6d4',
  brightWhite: '#0f172a',
};

// Dark theme inspired by GitHub Dark Default / OneDark
const darkTerminalTheme = {
  background: '#090d16', // deep dark slate
  foreground: '#e2e8f0', // slate-200
  cursor: '#38bdf8', // sky-400
  cursorAccent: '#090d16',
  selectionBackground: 'rgba(56, 189, 248, 0.25)',
  selectionForeground: '#ffffff',
  black: '#1e293b',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#38bdf8',
  white: '#f1f5f9',
  brightBlack: '#64748b',
  brightRed: '#fb7185',
  brightGreen: '#86efac',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9',
  brightWhite: '#ffffff',
};

export function KubectlTerminalDrawer({
  open,
  onClose,
  onOpen,
  clusterId,
  zIndex,
  onFocus,
}: KubectlTerminalDrawerProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [maximized, setMaximized] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'provisioning' | 'connected' | 'closed' | 'error'>('connecting');
  const [podName, setPodName] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const resizeHandlerRef = useRef<() => void>(() => {});

  // Keyboard shortcut listener (Ctrl+\ or Ctrl+`) to toggle KubeConsole
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if ((e.ctrlKey && e.key === '\\') || (e.ctrlKey && e.key === '`')) {
        e.preventDefault();
        if (open) {
          onClose();
        } else if (onOpen) {
          onOpen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onOpen]);

  // Main terminal initialization
  useEffect(() => {
    if (!open) return;

    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let ws: WebSocket;

    setConnectionStatus('connecting');

    const initTerminal = async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      term = new Terminal({
        cursorBlink: true,
        fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", Menlo, Monaco, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.25,
        theme: isDark ? darkTerminalTheme : lightTerminalTheme,
        allowTransparency: true,
      });

      termInstanceRef.current = term;
      fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      term.loadAddon(fitAddon);

      // Handle Escape key inside Xterm to close the window
      term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
        if (event.key === 'Escape' && event.type === 'keydown') {
          onClose();
          return false;
        }
        return true;
      });

      if (terminalRef.current) {
        terminalRef.current.innerHTML = '';
        term.open(terminalRef.current);
        fitAddon.fit();
      }

      term.writeln(`\x1b[90mConnecting to KubeConsole on cluster ${clusterId}...\x1b[0m`);

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
        ? backendUrl.startsWith('https')
          ? 'wss:'
          : 'ws:'
        : window.location.protocol === 'https:'
        ? 'wss:'
        : 'ws:';

      const wsUrl = `${protocol}//${wsHost}/api/clusters/${clusterId}/shell`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('provisioning');
        const dims = fitAddon?.proposeDimensions();
        if (dims) {
          ws.send(JSON.stringify({ resize: { cols: dims.cols, rows: dims.rows } }));
        }
      };

      ws.onmessage = (event) => {
        const text = event.data as string;
        const podMatch = text.match(/nextkube-shell-[a-zA-Z0-9_-]+/);
        if (podMatch && !podName) {
          setPodName(podMatch[0]);
        }
        if (text.includes('nextkube') && (text.includes('$') || text.includes('#'))) {
          setConnectionStatus('connected');
        } else if (text.includes('[OK]') || text.includes('Running')) {
          setConnectionStatus('connected');
        }
        term?.write(text);
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        term?.writeln('\n\x1b[31m[ERROR] Connection to cluster shell failed.\x1b[0m');
      };

      ws.onclose = () => {
        setConnectionStatus('closed');
        term?.writeln('\n\x1b[90mSession ended.\x1b[0m');
      };

      term.onData((data: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      const handleResize = () => {
        if (fitAddon && term) {
          fitAddon.fit();
          const dims = fitAddon.proposeDimensions();
          if (dims && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ resize: { cols: dims.cols, rows: dims.rows } }));
          }
        }
      };

      window.addEventListener('resize', handleResize);
      resizeHandlerRef.current = handleResize;

      setTimeout(() => fitAddon?.fit(), 100);
      setTimeout(() => fitAddon?.fit(), 350);
    };

    initTerminal();

    return () => {
      if (ws) ws.close();
      if (term) term.dispose();
      termInstanceRef.current = null;
      window.removeEventListener('resize', resizeHandlerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clusterId]);

  // Dynamically update terminal theme if mode switches while open
  useEffect(() => {
    if (termInstanceRef.current) {
      termInstanceRef.current.options.theme = isDark ? darkTerminalTheme : lightTerminalTheme;
    }
  }, [isDark]);

  // Re-fit terminal when size/state changes
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [maximized, open]);

  const sendQuickCommand = (cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd + '\r');
    }
  };

  const clearTerminal = () => {
    if (termInstanceRef.current) {
      termInstanceRef.current.clear();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('clear\r');
    }
  };

  const [outputCopied, setOutputCopied] = useState(false);
  const handleCopyAllOutput = async () => {
    try {
      let outputText = '';
      if (termInstanceRef.current) {
        const buffer = termInstanceRef.current.buffer.active;
        const lines: string[] = [];
        for (let i = 0; i < buffer.length; i++) {
          const line = buffer.getLine(i);
          if (line) lines.push(line.translateToString(true));
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
        setOutputCopied(true);
        setTimeout(() => setOutputCopied(false), 2000);
      }
    } catch (e) {
      console.error('Failed to copy terminal output:', e);
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
      maxWidth={maximized ? false : 'lg'}
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
          sx: {
            bgcolor: isDark ? '#0a0e17' : '#ffffff',
            backgroundImage: 'none',
            borderRadius: maximized ? 0 : 3,
            border: maximized ? 'none' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              : '0 25px 50px -12px rgba(15, 23, 42, 0.16)',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Title Bar matching Create Resource Modal Layout */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: isDark ? '#0f1422' : '#f8fafc',
          color: isDark ? '#f0f6fc' : '#0f172a',
          px: 3,
          py: 1.5,
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Icon, Title & Badges */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(56,189,248,0.15)' : 'rgba(2,132,199,0.1)',
              color: isDark ? '#38bdf8' : '#0284c7',
            }}
          >
            <CodeIcon sx={{ fontSize: 18 }} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '0.98rem',
                letterSpacing: '-0.02em',
              }}
            >
              KubeConsole
            </Typography>

            <Chip
              label={clusterId}
              size="small"
              sx={{
                height: 22,
                fontWeight: 700,
                fontSize: '0.72rem',
                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
                color: isDark ? '#cbd5e1' : '#334155',
                borderRadius: 1.5,
              }}
            />

            <Chip
              icon={<CloudQueueIcon sx={{ fontSize: '13px !important', color: 'inherit !important' }} />}
              label={podName ? `pod: ${podName}` : 'ephemeral pod'}
              size="small"
              sx={{
                height: 22,
                fontWeight: 650,
                fontSize: '0.7rem',
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.08)',
                color: isDark ? '#38bdf8' : '#0284c7',
                border: '1px solid',
                borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.2)',
                borderRadius: 1.5,
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, ml: 0.5 }}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor:
                    connectionStatus === 'connected'
                      ? '#22c55e'
                      : connectionStatus === 'provisioning'
                      ? '#eab308'
                      : '#ef4444',
                  animation: connectionStatus === 'provisioning' ? 'pulse 1.5s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { opacity: 0.4 },
                    '50%': { opacity: 1 },
                    '100%': { opacity: 0.4 },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                {connectionStatus === 'connected'
                  ? 'Ready'
                  : connectionStatus === 'provisioning'
                  ? 'Starting Pod...'
                  : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Disconnected'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Center: Command Snippets */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.6 }}>
          {[
            { label: 'Pods', cmd: 'k get pods -A', icon: <ViewAgendaOutlinedIcon sx={{ fontSize: 13 }} /> },
            { label: 'Nodes', cmd: 'k get nodes -o wide', icon: <DnsIcon sx={{ fontSize: 13 }} /> },
            { label: 'Deployments', cmd: 'k get deploy -A', icon: <LayersOutlinedIcon sx={{ fontSize: 13 }} /> },
            { label: 'Services', cmd: 'k get svc,ing -A', icon: <LanOutlinedIcon sx={{ fontSize: 13 }} /> },
            { label: 'Events', cmd: 'k get events -A --sort-by=.metadata.creationTimestamp | tail -n 15', icon: <EventNoteOutlinedIcon sx={{ fontSize: 13 }} /> },
          ].map((item) => (
            <Button
              key={item.label}
              size="small"
              onClick={() => sendQuickCommand(item.cmd)}
              startIcon={item.icon}
              sx={{
                height: 24,
                px: 1.1,
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 1.5,
                color: isDark ? '#cbd5e1' : '#475569',
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(2,132,199,0.08)',
                  borderColor: isDark ? 'rgba(56,189,248,0.3)' : 'rgba(2,132,199,0.3)',
                  color: isDark ? '#38bdf8' : '#0284c7',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Right: Window Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Tooltip title={outputCopied ? 'Copied Output to Clipboard!' : 'Copy All Output'}>
            <Button
              size="small"
              onClick={handleCopyAllOutput}
              startIcon={outputCopied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
              sx={{
                color: outputCopied ? '#22c55e' : (isDark ? '#cbd5e1' : '#475569'),
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1',
                borderRadius: 1.5,
                px: 1.2,
                py: 0.3,
                fontSize: '0.75rem',
                fontWeight: 650,
                textTransform: 'none',
                bgcolor: outputCopied ? (isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4') : 'transparent',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                },
              }}
            >
              {outputCopied ? 'Copied' : 'Copy Output'}
            </Button>
          </Tooltip>

          <Tooltip title="Clear Screen (Ctrl+L)">
            <Button
              size="small"
              onClick={clearTerminal}
              startIcon={<DeleteSweepIcon sx={{ fontSize: 16 }} />}
              sx={{
                color: isDark ? '#cbd5e1' : '#475569',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1',
                borderRadius: 1.5,
                px: 1.2,
                py: 0.3,
                fontSize: '0.75rem',
                fontWeight: 650,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                },
              }}
            >
              Clear
            </Button>
          </Tooltip>

          <Tooltip title={maximized ? 'Restore Window' : 'Maximize Window'}>
            <IconButton
              size="small"
              onClick={() => setMaximized(!maximized)}
              sx={{
                color: isDark ? '#cbd5e1' : '#475569',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1',
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

          <Tooltip title="Close Window (Esc)">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              sx={{
                color: isDark ? '#cbd5e1' : '#64748b',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1',
                borderRadius: 1.5,
                p: 0.6,
                zIndex: 2,
                cursor: 'pointer',
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

      {/* Subtitle Info Strip */}
      <Box
        sx={{
          px: 3,
          py: 0.9,
          bgcolor: isDark ? '#0c101c' : '#f1f5f9',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ color: isDark ? '#8b949e' : '#64748b', fontSize: '0.75rem' }}>
          Isolated in-cluster container environment • Full kubectl CLI access • Tab autocompletion pre-loaded
        </Typography>
        <Typography variant="caption" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.72rem' }}>
          Shortcut: Ctrl+\ to toggle
        </Typography>
      </Box>

      {/* Terminal Canvas */}
      <DialogContent sx={{ p: 0, bgcolor: isDark ? '#090d16' : '#ffffff', overflow: 'hidden', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          ref={terminalRef}
          sx={{
            flexGrow: 1,
            height: maximized ? 'calc(100vh - 180px)' : '480px',
            px: 2,
            py: 1.5,
            bgcolor: isDark ? '#090d16' : '#ffffff',
            overflow: 'hidden',
            '& .xterm': {
              height: '100%',
            },
            '& .xterm-viewport': {
              backgroundColor: 'transparent !important',
            },
            '& .xterm-screen': {
              backgroundColor: 'transparent !important',
            },
          }}
        />
      </DialogContent>

      {/* Action / Telemetry Footer matching DialogActions */}
      <DialogActions
        sx={{
          px: 3,
          py: 1.5,
          bgcolor: isDark ? '#0f1422' : '#f8fafc',
          borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: '0.72rem', color: isDark ? '#64748b' : '#94a3b8' }}>
          <Typography variant="caption" sx={{ fontSize: 'inherit', fontWeight: 650 }}>
            pod: {podName || 'initializing'}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 'inherit' }}>•</Typography>
          <Typography variant="caption" sx={{ fontSize: 'inherit' }}>
            100% in-cluster container
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 'inherit' }}>•</Typography>
          <Typography variant="caption" sx={{ fontSize: 'inherit' }}>
            ns: default
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 'inherit' }}>•</Typography>
          <Typography variant="caption" sx={{ fontSize: 'inherit' }}>
            limits: 512Mi / 1000m
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            onClick={onClose}
            size="small"
            sx={{
              fontWeight: 700,
              color: isDark ? '#94a3b8' : '#64748b',
              textTransform: 'none',
              px: 2,
              '&:hover': {
                color: '#ef4444',
                bgcolor: 'rgba(239, 68, 68, 0.08)',
              },
            }}
          >
            Close Session
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

// Export both names for maximum compatibility
export { KubectlTerminalDrawer as KubeConsoleDrawer };
