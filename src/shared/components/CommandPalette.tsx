'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HubIcon from '@mui/icons-material/Hub';
import DnsIcon from '@mui/icons-material/Dns';
import WidgetsIcon from '@mui/icons-material/Widgets';
import MemoryIcon from '@mui/icons-material/Memory';
import TerminalIcon from '@mui/icons-material/Terminal';
import SettingsIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import RefreshIcon from '@mui/icons-material/Refresh';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import AltRouteIcon from '@mui/icons-material/AltRouteRounded';
import { useColorMode } from '../theme/theme-registry';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  clusters?: Array<{ id: string; name: string }>;
  namespaces?: string[];
  currentClusterId?: string;
  onSwitchCluster?: (clusterId: string) => void;
  onSelectNamespace?: (namespace: string) => void;
  onNavigateTab?: (tabIndex: number) => void;
  onOpenConsole?: () => void;
  onOpenCreate?: () => void;
  onOpenPortForward?: () => void;
  onOpenSettings?: () => void;
  onRefresh?: () => void;
  customItems?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    category: string;
    shortcut?: string;
    action: () => void;
  }>;
}

interface PaletteActionItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Clusters' | 'Namespaces' | 'Navigation' | 'Actions';
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({
  open,
  onClose,
  clusters = [],
  namespaces = [],
  currentClusterId,
  onSwitchCluster,
  onSelectNamespace,
  onNavigateTab,
  onOpenConsole,
  onOpenCreate,
  onOpenPortForward,
  onOpenSettings,
  onRefresh,
  customItems = [],
}: CommandPaletteProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { toggleColorMode } = useColorMode();

  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build unified item list
  const allItems: PaletteActionItem[] = useMemo(() => {
    const list: PaletteActionItem[] = [];

    // 1. Navigation items
    const navItems = [
      { id: 'nav-overview', title: 'Cluster Overview & Observability', subtitle: 'View capacity gauges and fleet matrix', tab: 0, shortcut: 'Alt+O', icon: <SpeedIcon fontSize="small" sx={{ color: '#38bdf8' }} /> },
      { id: 'nav-topology', title: 'Visual Topology Map', subtitle: 'Interactive dependency graph & live traffic', tab: 26, shortcut: 'Alt+T', icon: <HubIcon fontSize="small" sx={{ color: '#818cf8' }} /> },
      { id: 'nav-pods', title: 'Pods Fleet', subtitle: 'Inspect and manage all running pods', tab: 1, shortcut: 'Alt+P', icon: <MemoryIcon fontSize="small" sx={{ color: '#f59e0b' }} /> },
      { id: 'nav-deployments', title: 'Deployments', subtitle: 'Scale and restart controllers', tab: 2, shortcut: 'Alt+E', icon: <WidgetsIcon fontSize="small" sx={{ color: '#a855f7' }} /> },
      { id: 'nav-helm', title: 'Helm App Store & Releases', subtitle: 'Browse catalog and manage releases', tab: 25, shortcut: 'Alt+H', icon: <StorageIcon fontSize="small" sx={{ color: '#ec4899' }} /> },
    ];

    navItems.forEach((n) => {
      list.push({
        id: n.id,
        title: n.title,
        subtitle: n.subtitle,
        category: 'Navigation',
        shortcut: n.shortcut,
        icon: n.icon,
        action: () => {
          onClose();
          onNavigateTab?.(n.tab);
        },
      });
    });

    // 2. Global Actions
    list.push({
      id: 'action-console',
      title: 'Open KubeConsole (Persistent Terminal)',
      subtitle: 'Instant in-cluster shell',
      category: 'Actions',
      shortcut: 'Ctrl+\\',
      icon: <TerminalIcon fontSize="small" sx={{ color: '#06b6d4' }} />,
      action: () => {
        onClose();
        onOpenConsole?.();
      },
    });

    list.push({
      id: 'action-create',
      title: 'Apply / Create Kubernetes Manifest',
      subtitle: 'Open in-browser YAML IDE',
      category: 'Actions',
      shortcut: 'Alt+A',
      icon: <AddCircleOutlineIcon fontSize="small" sx={{ color: '#10b981' }} />,
      action: () => {
        onClose();
        onOpenCreate?.();
      },
    });

    list.push({
      id: 'action-port-forward',
      title: 'Open Port-Forward Manager',
      subtitle: 'TCP/HTTP tunnels into private pods & services',
      category: 'Actions',
      shortcut: 'Alt+P',
      icon: <AltRouteIcon fontSize="small" sx={{ color: '#38bdf8' }} />,
      action: () => {
        onClose();
        onOpenPortForward?.();
      },
    });

    list.push({
      id: 'action-theme',
      title: `Switch to ${isDark ? 'Light' : 'Dark'} Mode`,
      subtitle: 'Toggle theme display appearance',
      category: 'Actions',
      shortcut: 'Alt+M',
      icon: isDark ? <LightModeIcon fontSize="small" sx={{ color: '#f59e0b' }} /> : <DarkModeIcon fontSize="small" sx={{ color: '#6366f1' }} />,
      action: () => {
        onClose();
        toggleColorMode();
      },
    });

    list.push({
      id: 'action-refresh',
      title: 'Refresh All Cluster Telemetry',
      subtitle: 'Sync live Kubernetes API state',
      category: 'Actions',
      shortcut: 'Alt+R',
      icon: <RefreshIcon fontSize="small" sx={{ color: '#64748b' }} />,
      action: () => {
        onClose();
        onRefresh?.();
      },
    });

    list.push({
      id: 'action-settings',
      title: 'Workspace & System Settings',
      subtitle: 'Configure hotkeys, preferences, and profiles',
      category: 'Actions',
      shortcut: 'Alt+,',
      icon: <SettingsIcon fontSize="small" sx={{ color: '#64748b' }} />,
      action: () => {
        onClose();
        onOpenSettings?.();
      },
    });

    // 3. Attached Clusters
    clusters.forEach((c) => {
      const isCurrent = c.id === currentClusterId;
      list.push({
        id: `cluster-${c.id}`,
        title: `Switch to Cluster: ${c.name}`,
        subtitle: isCurrent ? 'Currently active cluster' : `Cluster ID: ${c.id}`,
        category: 'Clusters',
        icon: <DnsIcon fontSize="small" sx={{ color: isCurrent ? '#10b981' : '#64748b' }} />,
        action: () => {
          onClose();
          onSwitchCluster?.(c.id);
        },
      });
    });

    // 4. Cluster Namespaces
    namespaces.forEach((ns) => {
      list.push({
        id: `ns-${ns}`,
        title: `Filter Namespace: ${ns}`,
        subtitle: 'Switch active namespace view',
        category: 'Namespaces',
        icon: <FolderIcon fontSize="small" sx={{ color: '#38bdf8' }} />,
        action: () => {
          onClose();
          onSelectNamespace?.(ns);
        },
      });
    });

    // 5. Custom Items
    customItems.forEach((ci) => {
      list.push({
        id: ci.id,
        title: ci.title,
        subtitle: ci.subtitle,
        category: ci.category as any,
        shortcut: ci.shortcut,
        icon: <WidgetsIcon fontSize="small" sx={{ color: '#8b5cf6' }} />,
        action: () => {
          onClose();
          ci.action();
        },
      });
    });

    return list;
  }, [
    clusters,
    namespaces,
    currentClusterId,
    isDark,
    customItems,
    onClose,
    onNavigateTab,
    onOpenConsole,
    onOpenCreate,
    onOpenPortForward,
    onOpenSettings,
    onRefresh,
    onSelectNamespace,
    onSwitchCluster,
    toggleColorMode,
  ]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filteredItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            backgroundImage: 'none',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            border: `1.5px solid ${theme.palette.divider}`,
            overflow: 'hidden',
            mt: -12,
          },
        },
      }}
    >
      {/* SEARCH INPUT BAR */}
      <Box sx={{ p: 2, pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          placeholder="Type a command, cluster, workload, or namespace... (Esc to exit)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip
                    size="small"
                    label="Ctrl+K"
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      height: 20,
                      borderRadius: 1,
                      bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }}
                  />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: '0.95rem',
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            },
          }}
        />
      </Box>

      {/* RESULTS LIST */}
      <Box sx={{ maxHeight: 420, overflowY: 'auto', p: 1.5 }}>
        {filteredItems.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No matching actions or resources found for &ldquo;{query}&rdquo;
            </Typography>
          </Box>
        ) : (
          filteredItems.map((item, index) => {
            const isSelected = selectedIndex === index;
            return (
              <Paper
                key={item.id}
                elevation={0}
                onClick={() => item.action()}
                onMouseEnter={() => setSelectedIndex(index)}
                sx={{
                  p: 1.2,
                  px: 1.5,
                  mb: 0.5,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  bgcolor: isSelected
                    ? isDark
                      ? alpha(theme.palette.primary.main, 0.18)
                      : alpha(theme.palette.primary.main, 0.1)
                    : 'transparent',
                  border: `1px solid ${isSelected ? alpha(theme.palette.primary.main, 0.4) : 'transparent'}`,
                  transition: 'all 0.12s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </Typography>
                    {item.subtitle && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.72rem',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.subtitle}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  <Chip
                    size="small"
                    label={item.category}
                    sx={{
                      fontSize: '0.62rem',
                      height: 18,
                      fontWeight: 600,
                      borderRadius: 1,
                      bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    }}
                  />
                  {item.shortcut && (
                    <Chip
                      size="small"
                      label={item.shortcut}
                      sx={{
                        fontSize: '0.62rem',
                        fontFamily: 'monospace',
                        height: 18,
                        borderRadius: 1,
                        bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                      }}
                    />
                  )}
                </Box>
              </Paper>
            );
          })
        )}
      </Box>

      {/* FOOTER HELPER */}
      <Box
        sx={{
          p: 1.2,
          px: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          Navigate with <strong style={{ color: isDark ? '#fff' : '#000' }}>↑ ↓</strong> • Select with <strong style={{ color: isDark ? '#fff' : '#000' }}>Enter</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          NextKube Universal Omnibar
        </Typography>
      </Box>
    </Dialog>
  );
}
