'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Button,
} from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import '@xterm/xterm/css/xterm.css';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

export interface KubectlTerminalDrawerProps {
  open: boolean;
  onClose: () => void;
  clusterId: string;
}

export function KubectlTerminalDrawer({
  open,
  onClose,
  clusterId,
}: KubectlTerminalDrawerProps) {
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [connected, setConnected] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const resizeHandlerRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!open || minimized) return;

    let termInstance: Terminal | null = null;
    let fitAddonInstance: FitAddon | null = null;
    let ws: WebSocket;

    const initTerminal = async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      termInstance = new Terminal({
        cursorBlink: true,
        fontFamily: 'monospace, "Fira Code", "Courier New"',
        fontSize: 13,
        lineHeight: 1.25,
        theme: {
          background: '#090d16',
          foreground: '#e2e8f0',
          cursor: '#38bdf8',
          black: '#1e293b',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#f8fafc',
          brightBlack: '#64748b',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#fde047',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff',
        },
      });

      fitAddonInstance = new FitAddon();
      termInstance.loadAddon(fitAddonInstance);

      if (terminalRef.current) {
        termInstance.open(terminalRef.current);
        fitAddonInstance.fit();
      }

      termInstance.writeln('\x1b[90mInitializing interactive kubectl environment...\x1b[0m');

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
        setConnected(true);
        const dims = fitAddonInstance?.proposeDimensions();
        if (dims) {
          ws.send(JSON.stringify({ resize: { cols: dims.cols, rows: dims.rows } }));
        }
      };

      ws.onmessage = (event) => {
        termInstance?.write(event.data);
      };

      ws.onerror = () => {
        termInstance?.writeln('\n\x1b[31m[ERROR] Connection to cluster shell failed.\x1b[0m');
      };

      ws.onclose = () => {
        setConnected(false);
        termInstance?.writeln('\n\x1b[90mSession closed.\x1b[0m');
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
  }, [open, minimized, clusterId]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => {
        resizeHandlerRef.current();
      }, 150);
    }
  }, [maximized, open, minimized]);

  const sendQuickCommand = (cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd + '\r');
    }
  };

  const clearTerminal = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('clear\r');
    }
  };

  if (!open) return null;

  // Minimized floating pill dock
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
            Kubectl Shell: {clusterId}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
            <FiberManualRecordIcon sx={{ color: connected ? '#34d399' : '#94a3b8', fontSize: 10 }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600 }}>
              {connected ? 'Active Session' : 'Disconnected'}
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

  // Active bottom dock drawer
  return (
    <Paper
      elevation={12}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: maximized ? '100vh' : { xs: 380, sm: 420 },
        zIndex: 1300,
        bgcolor: '#090d16',
        borderTop: '2px solid',
        borderColor: 'primary.main',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'height 0.2s ease',
      }}
    >
      {/* Top Header Bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2.5,
          py: 1,
          bgcolor: '#0f172a',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        {/* Left: Terminal Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TerminalIcon sx={{ color: '#38bdf8', fontSize: 22 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
            Kubectl Shell
          </Typography>
          <Chip
            label={clusterId}
            size="small"
            sx={{
              height: 22,
              fontWeight: 750,
              fontSize: '0.72rem',
              bgcolor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FiberManualRecordIcon sx={{ color: connected ? '#22c55e' : '#ef4444', fontSize: 10 }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>
              {connected ? 'Connected' : 'Connecting...'}
            </Typography>
          </Box>
        </Box>

        {/* Middle: Quick Command Chips */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.8 }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, mr: 0.5, textTransform: 'uppercase' }}>
            Quick:
          </Typography>
          {[
            { label: 'k get pods -A', cmd: 'k get pods -A' },
            { label: 'k get nodes -o wide', cmd: 'k get nodes -o wide' },
            { label: 'k get events', cmd: 'k get events --sort-by=.metadata.creationTimestamp | tail -n 15' },
            { label: 'k cluster-info', cmd: 'k cluster-info' },
          ].map((item) => (
            <Chip
              key={item.label}
              icon={<PlayArrowIcon sx={{ fontSize: '12px !important', color: '#38bdf8 !important' }} />}
              label={item.label}
              size="small"
              onClick={() => sendQuickCommand(item.cmd)}
              sx={{
                height: 22,
                fontSize: '0.68rem',
                fontFamily: 'monospace',
                bgcolor: 'rgba(255,255,255,0.06)',
                color: '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(56, 189, 248, 0.15)',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                },
              }}
            />
          ))}
        </Box>

        {/* Right: Window Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Tooltip title="Clear Screen">
            <IconButton
              onClick={clearTerminal}
              size="small"
              sx={{ color: '#94a3b8', p: 0.6, '&:hover': { color: '#f8fafc' } }}
            >
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={maximized ? 'Restore Height' : 'Maximize Terminal'}>
            <IconButton
              onClick={() => setMaximized(!maximized)}
              size="small"
              sx={{ color: '#94a3b8', p: 0.6, '&:hover': { color: '#f8fafc' } }}
            >
              {maximized ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Minimize to Pill">
            <IconButton
              onClick={() => setMinimized(true)}
              size="small"
              sx={{ color: '#94a3b8', p: 0.6, '&:hover': { color: '#f8fafc' } }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Close Shell">
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ color: '#94a3b8', p: 0.6, '&:hover': { color: '#ef4444' } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Terminal Canvas Area */}
      <Box
        ref={terminalRef}
        sx={{
          flexGrow: 1,
          p: 1.5,
          bgcolor: '#090d16',
          overflow: 'hidden',
          '& .xterm': {
            height: '100%',
          },
          '& .xterm-viewport': {
            backgroundColor: 'transparent !important',
          },
        }}
      />
    </Paper>
  );
}
