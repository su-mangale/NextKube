'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Tooltip,
  IconButton,
  Divider,
  useTheme,
} from '@mui/material';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import { useShortcuts } from '../utils/shortcuts';

export interface ExecSessionItem {
  id: string;
  resourceName: string;
  resourceType?: 'pod' | 'node';
  namespace?: string;
  container?: string;
  minimized: boolean;
}

export interface ActionDockProps {
  onToggleConsole: () => void;
  isConsoleOpen: boolean;
  isConsoleConnected?: boolean;
  isConsoleMinimized?: boolean;
  onCreateResource: () => void;
  onToggleTopology?: () => void;
  isTopologyActive?: boolean;
  onAddCluster?: () => void;
  onSwitchCluster?: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  // Multi-session Exec Support
  execSessions?: ExecSessionItem[];
  onToggleSession?: (sessionId: string) => void;
  onCloseSession?: (sessionId: string) => void;
  // Single Exec Fallback
  hasActiveExec?: boolean;
  isExecMinimized?: boolean;
  onToggleExec?: () => void;
  execResourceName?: string;
}

export function ActionDock({
  onToggleConsole,
  isConsoleOpen,
  isConsoleConnected = false,
  isConsoleMinimized = false,
  onCreateResource,
  onToggleTopology,
  isTopologyActive = false,
  onAddCluster,
  onSwitchCluster,
  onOpenSettings,
  onLogout,
  execSessions,
  onToggleSession,
  hasActiveExec = false,
  isExecMinimized = false,
  onToggleExec,
  execResourceName,
}: ActionDockProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const { getShortcutKey } = useShortcuts();

  const [isDockVisible, setIsDockVisible] = useState<boolean>(true);

  // Sync dock visibility with localStorage and global events
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nextkube-dock-visible');
      setIsDockVisible(saved !== 'false');

      const handleVisibilityChange = () => {
        const val = localStorage.getItem('nextkube-dock-visible');
        setIsDockVisible(val !== 'false');
      };

      window.addEventListener('nextkube-dock-visibility-change', handleVisibilityChange);
      window.addEventListener('storage', handleVisibilityChange);
      return () => {
        window.removeEventListener('nextkube-dock-visibility-change', handleVisibilityChange);
        window.removeEventListener('storage', handleVisibilityChange);
      };
    }
  }, []);

  const handleHideDock = () => {
    setIsDockVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nextkube-dock-visible', 'false');
      window.dispatchEvent(new Event('nextkube-dock-visibility-change'));
    }
  };

  const handleShowDock = () => {
    setIsDockVisible(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nextkube-dock-visible', 'true');
      window.dispatchEvent(new Event('nextkube-dock-visibility-change'));
    }
  };

  // If dock is hidden, show sleek edge tab
  if (!isDockVisible) {
    return (
      <Tooltip title="Show Action Dock" placement="left" arrow>
        <Box
          onClick={handleShowDock}
          sx={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1350,
            width: 24,
            height: 64,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
            background: isDark
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.6) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(240, 246, 255, 0.6) 100%)',
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.75)',
            borderRight: 'none',
            boxShadow: isDark
              ? 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.2), 0 10px 24px rgba(0, 0, 0, 0.5)'
              : 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.9), 0 8px 20px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isDark ? '#94a3b8' : '#64748b',
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '&:hover': {
              width: 30,
              color: isDark ? '#38bdf8' : '#0284c7',
            },
          }}
        >
          <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
          {(isConsoleOpen || isConsoleConnected || (execSessions && execSessions.length > 0) || hasActiveExec) && (
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: (isConsoleOpen || (execSessions && execSessions.some((s) => !s.minimized)) || hasActiveExec) ? '#38bdf8' : '#22c55e',
                boxShadow: '0 0 6px currentColor',
                mt: 0.5,
              }}
            />
          )}
        </Box>
      </Tooltip>
    );
  }

  // Expanded Liquid Glassmorphic Action Dock
  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 10, sm: 16 },
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1400,
        pointerEvents: 'auto',
        animation: 'dockSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        '@keyframes dockSlideIn': {
          '0%': { opacity: 0, transform: 'translateY(-50%) translateX(20px)' },
          '100%': { opacity: 1, transform: 'translateY(-50%) translateX(0)' },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.25,
          py: 1.4,
          px: 1,
          borderRadius: '30px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.55) 0%, rgba(15, 23, 42, 0.45) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(245, 247, 250, 0.52) 100%)',
          backdropFilter: 'blur(36px) saturate(210%)',
          WebkitBackdropFilter: 'blur(36px) saturate(210%)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.85)',
          boxShadow: isDark
            ? 'inset 0 1px 2px 0 rgba(255, 255, 255, 0.22), 0 20px 48px -8px rgba(0, 0, 0, 0.75)'
            : 'inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.95), 0 18px 40px -8px rgba(15, 23, 42, 0.14)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          '&:hover': {
            boxShadow: isDark
              ? 'inset 0 1px 2px 0 rgba(255, 255, 255, 0.3), 0 24px 56px -6px rgba(0, 0, 0, 0.85)'
              : 'inset 0 1.5px 2px 0 rgba(255, 255, 255, 1), 0 22px 48px -6px rgba(15, 23, 42, 0.18)',
          },
        }}
      >
        {/* 1. KubeConsole Interactive Shell */}
        <Tooltip
          title={
            isConsoleConnected
              ? isConsoleMinimized
                ? `KubeConsole • Minimized · Click to restore (${getShortcutKey('console') || 'Ctrl+\\'})`
                : `KubeConsole • Active · Click to minimize (${getShortcutKey('console') || 'Ctrl+\\'})`
              : `KubeConsole • Interactive Cluster Shell (${getShortcutKey('console') || 'Ctrl+\\'})`
          }
          placement="left"
          arrow
        >
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={onToggleConsole}
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                bgcolor: isDark
                  ? isConsoleOpen
                    ? 'rgba(56, 189, 248, 0.25)'
                    : isConsoleConnected
                      ? 'rgba(34, 197, 94, 0.18)'
                      : 'rgba(56, 189, 248, 0.15)'
                  : isConsoleOpen
                    ? 'rgba(2, 132, 199, 0.2)'
                    : isConsoleConnected
                      ? 'rgba(22, 163, 74, 0.15)'
                      : 'rgba(2, 132, 199, 0.12)',
                color: isDark
                  ? isConsoleConnected && isConsoleMinimized
                    ? '#4ade80'
                    : '#38bdf8'
                  : isConsoleConnected && isConsoleMinimized
                    ? '#16a34a'
                    : '#0284c7',
                border: '1px solid',
                borderColor: isDark
                  ? isConsoleConnected && isConsoleMinimized
                    ? 'rgba(74, 222, 128, 0.4)'
                    : 'rgba(56, 189, 248, 0.28)'
                  : isConsoleConnected && isConsoleMinimized
                    ? 'rgba(22, 163, 74, 0.35)'
                    : 'rgba(2, 132, 199, 0.22)',
                transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '&:hover': {
                  transform: 'scale(1.15)',
                  bgcolor: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.2)',
                  borderColor: isDark ? '#38bdf8' : '#0284c7',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <TerminalRoundedIcon sx={{ fontSize: 21 }} />
            </IconButton>

            {/* Active Running Indicator Pill */}
            <Box
              sx={{
                position: 'absolute',
                left: -6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 4,
                height: isConsoleOpen ? 16 : isConsoleConnected ? 10 : 4,
                borderRadius: 2,
                bgcolor: isConsoleOpen
                  ? '#38bdf8'
                  : isConsoleConnected
                    ? '#22c55e'
                    : 'transparent',
                boxShadow: isConsoleOpen
                  ? '0 0 6px #38bdf8'
                  : isConsoleConnected
                    ? '0 0 5px #22c55e'
                    : 'none',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          </Box>
        </Tooltip>

        {/* 2. Pod Exec Live Shell Button(s) (Multi-Session or Single) */}
        {execSessions && execSessions.length > 0 ? (
          execSessions.map((session, index) => {
            const label = `${session.resourceName}${session.container ? ` [${session.container}]` : ''}`;
            const isMin = session.minimized;
            return (
              <Tooltip
                key={session.id}
                title={`Pod Exec • ${label} (${isMin ? 'Minimized · Click to restore' : 'Active · Click to minimize'})`}
                placement="left"
                arrow
              >
                <Box sx={{ position: 'relative' }}>
                  <IconButton
                    onClick={() => {
                      if (onToggleSession) {
                        onToggleSession(session.id);
                      } else if (onToggleExec) {
                        onToggleExec();
                      }
                    }}
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      bgcolor: isDark ? 'rgba(129, 140, 248, 0.16)' : 'rgba(99, 102, 241, 0.12)',
                      color: isDark ? '#818cf8' : '#4f46e5',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(129, 140, 248, 0.3)' : 'rgba(99, 102, 241, 0.24)',
                      transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      '&:hover': {
                        transform: 'scale(1.15)',
                        bgcolor: isDark ? 'rgba(129, 140, 248, 0.28)' : 'rgba(99, 102, 241, 0.22)',
                        borderColor: isDark ? '#818cf8' : '#4f46e5',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
                      },
                    }}
                  >
                    <ViewInArRoundedIcon sx={{ fontSize: 21 }} />
                    {execSessions.length > 1 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 1,
                          right: 1,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          bgcolor: isDark ? '#0f172a' : '#ffffff',
                          border: '1px solid',
                          borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                          fontSize: '9px',
                          fontWeight: 850,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isDark ? '#818cf8' : '#4f46e5',
                        }}
                      >
                        {index + 1}
                      </Box>
                    )}
                  </IconButton>

                  {/* Status indicator */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 4,
                      height: !isMin ? 16 : 4,
                      borderRadius: 2,
                      bgcolor: '#22c55e',
                      boxShadow: '0 0 6px #22c55e',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                </Box>
              </Tooltip>
            );
          })
        ) : hasActiveExec ? (
          <Tooltip
            title={`Pod Exec • ${execResourceName || 'Container Shell'} (${isExecMinimized ? 'Click to restore' : 'Click to minimize'})`}
            placement="left"
            arrow
          >
            <Box sx={{ position: 'relative' }}>
              <IconButton
                onClick={onToggleExec}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  bgcolor: isDark ? 'rgba(129, 140, 248, 0.16)' : 'rgba(99, 102, 241, 0.12)',
                  color: isDark ? '#818cf8' : '#4f46e5',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(129, 140, 248, 0.3)' : 'rgba(99, 102, 241, 0.24)',
                  transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  '&:hover': {
                    transform: 'scale(1.15)',
                    bgcolor: isDark ? 'rgba(129, 140, 248, 0.28)' : 'rgba(99, 102, 241, 0.22)',
                    borderColor: isDark ? '#818cf8' : '#4f46e5',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                <ViewInArRoundedIcon sx={{ fontSize: 21 }} />
              </IconButton>

              {/* Status indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  left: -6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 4,
                  height: !isExecMinimized ? 16 : 4,
                  borderRadius: 2,
                  bgcolor: '#22c55e',
                  boxShadow: '0 0 6px #22c55e',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </Box>
          </Tooltip>
        ) : null}

        {/* Visual Topology Map */}
        {onToggleTopology && (
          <Tooltip title={`Visual Topology Map (${getShortcutKey('topology') || 'Alt+T'})`} placement="left" arrow>
            <IconButton
              onClick={onToggleTopology}
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                bgcolor: isTopologyActive
                  ? isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.22)'
                  : isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                color: isDark ? '#60a5fa' : '#2563eb',
                border: '1px solid',
                borderColor: isTopologyActive
                  ? isDark ? '#60a5fa' : '#2563eb'
                  : isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.22)',
                boxShadow: isTopologyActive ? '0 0 10px rgba(59, 130, 246, 0.4)' : undefined,
                transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '&:hover': {
                  transform: 'scale(1.15)',
                  bgcolor: isDark ? 'rgba(59, 130, 246, 0.28)' : 'rgba(59, 130, 246, 0.2)',
                  borderColor: isDark ? '#60a5fa' : '#2563eb',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <HubRoundedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* 3. Apply / Create Resource Manifest */}
        <Tooltip title={`Apply / Create Resource Manifest (${getShortcutKey('create') || 'Alt+A'})`} placement="left" arrow>
          <IconButton
            onClick={onCreateResource}
            sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              bgcolor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.12)',
              color: isDark ? '#34d399' : '#059669',
              border: '1px solid',
              borderColor: isDark ? 'rgba(52, 211, 153, 0.28)' : 'rgba(16, 185, 129, 0.22)',
              transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '&:hover': {
                transform: 'scale(1.15)',
                bgcolor: isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(16, 185, 129, 0.22)',
                borderColor: isDark ? '#34d399' : '#059669',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <AddRoundedIcon sx={{ fontSize: 23 }} />
          </IconButton>
        </Tooltip>

        {/* 4. Add / Attach Cluster via Kubeconfig */}
        {onAddCluster && (
          <Tooltip title={`Add Cluster • Attach via Kubeconfig (${getShortcutKey('addCluster') || 'Alt+N'})`} placement="left" arrow>
            <IconButton
              onClick={onAddCluster}
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                bgcolor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(8, 145, 178, 0.12)',
                color: isDark ? '#22d3ee' : '#0891b2',
                border: '1px solid',
                borderColor: isDark ? 'rgba(6, 182, 212, 0.28)' : 'rgba(8, 145, 178, 0.22)',
                transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '&:hover': {
                  transform: 'scale(1.15)',
                  bgcolor: isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(8, 145, 178, 0.2)',
                  borderColor: isDark ? '#22d3ee' : '#0891b2',
                  boxShadow: '0 4px 14px rgba(8, 145, 178, 0.35)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <CloudUploadRoundedIcon sx={{ fontSize: 21 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* 5. Switch Cluster Quick Selector */}
        {onSwitchCluster && (
          <Tooltip title={`Switch Cluster (${getShortcutKey('switchCluster') || 'Alt+S'})`} placement="left" arrow>
            <IconButton
              onClick={onSwitchCluster}
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                bgcolor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.12)',
                color: isDark ? '#fbbf24' : '#d97706',
                border: '1px solid',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.28)' : 'rgba(217, 119, 6, 0.22)',
                transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '&:hover': {
                  transform: 'scale(1.15)',
                  bgcolor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(217, 119, 6, 0.2)',
                  borderColor: isDark ? '#fbbf24' : '#d97706',
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <SwapHorizRoundedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* 6. Workspace & System Settings */}
        <Tooltip title={`System & Workspace Settings (${getShortcutKey('settings') || 'Alt+,'})`} placement="left" arrow>
          <IconButton
            onClick={onOpenSettings}
            sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              bgcolor: isDark ? 'rgba(192, 132, 252, 0.15)' : 'rgba(147, 51, 234, 0.12)',
              color: isDark ? '#c084fc' : '#9333ea',
              border: '1px solid',
              borderColor: isDark ? 'rgba(192, 132, 252, 0.28)' : 'rgba(147, 51, 234, 0.22)',
              transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '&:hover': {
                transform: 'scale(1.15) rotate(45deg)',
                bgcolor: isDark ? 'rgba(192, 132, 252, 0.25)' : 'rgba(147, 51, 234, 0.22)',
                borderColor: isDark ? '#c084fc' : '#9333ea',
                boxShadow: '0 4px 14px rgba(147, 51, 234, 0.35)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <SettingsRoundedIcon sx={{ fontSize: 21 }} />
          </IconButton>
        </Tooltip>

        {/* Separator Divider */}
        <Divider
          sx={{
            width: 24,
            my: 0.2,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
          }}
        />

        {/* 5. Sign Out / Logout */}
        <Tooltip title="Sign Out of NextKube" placement="left" arrow>
          <IconButton
            onClick={onLogout}
            sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              bgcolor: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(239, 68, 68, 0.12)',
              color: isDark ? '#f87171' : '#dc2626',
              border: '1px solid',
              borderColor: isDark ? 'rgba(248, 113, 113, 0.28)' : 'rgba(239, 68, 68, 0.22)',
              transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '&:hover': {
                transform: 'scale(1.15)',
                bgcolor: isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.22)',
                borderColor: isDark ? '#f87171' : '#dc2626',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <LogoutRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        {/* 7. Collapse Dock Button */}
        <Tooltip title={`Hide Dock (${getShortcutKey('toggleDock') || 'Alt+D'})`} placement="left" arrow>
          <IconButton
            onClick={handleHideDock}
            size="small"
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              color: isDark ? '#94a3b8' : '#64748b',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
              transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
              mt: 0.2,
              '&:hover': {
                transform: 'translateX(2px) scale(1.1)',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
                color: isDark ? '#ffffff' : '#0f172a',
              },
            }}
          >
            <ChevronRightRoundedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
