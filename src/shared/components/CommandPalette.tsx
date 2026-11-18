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
import CompareArrowsIcon from '@mui/icons-material/CompareArrowsRounded';
import AutoModeIcon from '@mui/icons-material/AutoModeRounded';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOnRounded';
import ShieldIcon from '@mui/icons-material/ShieldRounded';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeedRounded';
import LayersIcon from '@mui/icons-material/LayersRounded';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlineRounded';
import UpdateIcon from '@mui/icons-material/UpdateRounded';
import RouterIcon from '@mui/icons-material/RouterRounded';
import LanguageIcon from '@mui/icons-material/LanguageRounded';
import DeviceHubIcon from '@mui/icons-material/DeviceHubRounded';
import PolicyIcon from '@mui/icons-material/PolicyRounded';
import DescriptionIcon from '@mui/icons-material/DescriptionRounded';
import KeyIcon from '@mui/icons-material/KeyRounded';
import WarehouseIcon from '@mui/icons-material/WarehouseRounded';
import PeopleIcon from '@mui/icons-material/PeopleRounded';
import LockPersonIcon from '@mui/icons-material/LockPersonRounded';
import ExtensionIcon from '@mui/icons-material/ExtensionRounded';
import NotificationsIcon from '@mui/icons-material/NotificationsRounded';
import HistoryIcon from '@mui/icons-material/HistoryRounded';
import StorefrontIcon from '@mui/icons-material/StorefrontRounded';
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
  onOpenDiff?: () => void;
  onOpenConfigDrift?: () => void;
  onOpenCostAllocation?: () => void;
  onOpenSecurityPosture?: () => void;
  onOpenNamespaceCloner?: () => void;
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
  category: string;
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
  onOpenDiff,
  onOpenConfigDrift,
  onOpenCostAllocation,
  onOpenSecurityPosture,
  onOpenNamespaceCloner,
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

    // 1. Navigation items (All 33 Kubernetes Objects & Views)
    const navItems = [
      // Platform & Observability
      { id: 'nav-overview', title: 'Cluster Overview & Observability', subtitle: 'Capacity gauges, resource saturation & fleet matrix', tab: 0, category: 'Platform Tools', shortcut: 'Alt+O', icon: <SpeedIcon fontSize="small" sx={{ color: '#38bdf8' }} /> },
      { id: 'nav-topology', title: 'Visual Topology Map', subtitle: 'Live architecture graph, workloads & network flows', tab: 26, category: 'Platform Tools', shortcut: 'Alt+T', icon: <HubIcon fontSize="small" sx={{ color: '#818cf8' }} /> },
      { id: 'nav-helm', title: 'Helm App Store & Releases', subtitle: 'Browse catalog charts and manage installed releases', tab: 25, category: 'Platform Tools', shortcut: 'Alt+H', icon: <StorefrontIcon fontSize="small" sx={{ color: '#ec4899' }} /> },
      { id: 'nav-audit', title: 'Audit Trail & Cluster Events', subtitle: 'Audit log timeline and control-plane activity', tab: 24, category: 'Platform Tools', icon: <HistoryIcon fontSize="small" sx={{ color: '#64748b' }} /> },
      { id: 'nav-settings', title: 'Workspace & System Settings', subtitle: 'Configure appearance, user profiles, and keyboard shortcuts', tab: 27, category: 'Platform Tools', shortcut: 'Alt+,', icon: <SettingsIcon fontSize="small" sx={{ color: '#94a3b8' }} /> },
      { id: 'nav-port-forward', title: 'Port-Forward Manager', subtitle: 'Active TCP/HTTP tunnels into private pods & services', tab: 28, category: 'Platform Tools', shortcut: 'Alt+P', icon: <AltRouteIcon fontSize="small" sx={{ color: '#38bdf8' }} /> },
      { id: 'nav-config-drift', title: 'Config Drift Detector', subtitle: 'Detect pods running outdated configurations after ConfigMap/Secret edits', tab: 29, category: 'Platform Tools', shortcut: 'Alt+C', icon: <AutoModeIcon fontSize="small" sx={{ color: '#f59e0b' }} /> },
      { id: 'nav-gitops', title: 'GitOps Time Machine (YAML Diff)', subtitle: 'Compare rollout revisions, live vs applied manifests & environments', tab: 30, category: 'Platform Tools', shortcut: 'Alt+G', icon: <CompareArrowsIcon fontSize="small" sx={{ color: '#a855f7' }} /> },
      { id: 'nav-cost', title: 'Cost Allocation & Right-Sizing', subtitle: 'Analyze monthly Kubernetes spend, wasted allocation & 1-click resource tuning', tab: 31, category: 'Platform Tools', shortcut: 'Alt+$', icon: <MonetizationOnIcon fontSize="small" sx={{ color: '#10b981' }} /> },
      { id: 'nav-security', title: 'Security Posture & CIS Audit', subtitle: 'Audit Pod Security Standards (PSS), CIS benchmark & RBAC policies', tab: 32, category: 'Platform Tools', shortcut: 'Alt+S', icon: <ShieldIcon fontSize="small" sx={{ color: '#ef4444' }} /> },

      // Workloads
      { id: 'nav-pods', title: 'Pods Fleet', subtitle: 'Inspect, diagnose, and manage all running pods', tab: 1, category: 'Workloads', icon: <MemoryIcon fontSize="small" sx={{ color: '#f59e0b' }} /> },
      { id: 'nav-deployments', title: 'Deployments', subtitle: 'Scale, restart, and rollout application controllers', tab: 2, category: 'Workloads', shortcut: 'Alt+E', icon: <LayersIcon fontSize="small" sx={{ color: '#a855f7' }} /> },
      { id: 'nav-daemonsets', title: 'DaemonSets', subtitle: 'Manage node agent and infrastructure daemon workloads', tab: 3, category: 'Workloads', icon: <WidgetsIcon fontSize="small" sx={{ color: '#6366f1' }} /> },
      { id: 'nav-statefulsets', title: 'StatefulSets', subtitle: 'Manage stateful clustered workloads and persistent storage', tab: 4, category: 'Workloads', icon: <WarehouseIcon fontSize="small" sx={{ color: '#06b6d4' }} /> },
      { id: 'nav-replicasets', title: 'ReplicaSets', subtitle: 'Inspect underlying deployment replica controllers', tab: 5, category: 'Workloads', icon: <PrecisionManufacturingIcon fontSize="small" sx={{ color: '#14b8a6' }} /> },
      { id: 'nav-jobs', title: 'Batch Jobs', subtitle: 'Run-to-completion batch execution tasks', tab: 6, category: 'Workloads', icon: <WorkOutlineIcon fontSize="small" sx={{ color: '#84cc16' }} /> },
      { id: 'nav-cronjobs', title: 'CronJobs', subtitle: 'Automated scheduled tasks and recurring executions', tab: 7, category: 'Workloads', icon: <UpdateIcon fontSize="small" sx={{ color: '#eab308' }} /> },

      // Networking
      { id: 'nav-services', title: 'Services (Core DNS & LB)', subtitle: 'ClusterIP, NodePort, and LoadBalancer discovery endpoints', tab: 8, category: 'Networking', icon: <RouterIcon fontSize="small" sx={{ color: '#38bdf8' }} /> },
      { id: 'nav-ingresses', title: 'Ingresses', subtitle: 'HTTP/HTTPS external routing rules and SSL/TLS ingress', tab: 9, category: 'Networking', icon: <LanguageIcon fontSize="small" sx={{ color: '#0ea5e9' }} /> },
      { id: 'nav-gateway-api', title: 'Gateway API (Gateways & Routes)', subtitle: 'Next-gen Gateway API listeners and HTTPRoute routing', tab: 23, category: 'Networking', icon: <DeviceHubIcon fontSize="small" sx={{ color: '#6366f1' }} /> },
      { id: 'nav-network-policies', title: 'Network Policies', subtitle: 'Zero-trust egress and ingress packet isolation policies', tab: 10, category: 'Networking', icon: <PolicyIcon fontSize="small" sx={{ color: '#ec4899' }} /> },

      // Config & Storage
      { id: 'nav-configmaps', title: 'ConfigMaps', subtitle: 'Manage non-confidential configuration key-value pairs', tab: 11, category: 'Config & Storage', icon: <DescriptionIcon fontSize="small" sx={{ color: '#3b82f6' }} /> },
      { id: 'nav-secrets', title: 'Secrets', subtitle: 'Encrypted certificates, tokens, and confidential keys', tab: 12, category: 'Config & Storage', icon: <KeyIcon fontSize="small" sx={{ color: '#f43f5e' }} /> },
      { id: 'nav-pvcs', title: 'PersistentVolumeClaims (PVC)', subtitle: 'Storage volume allocations claimed by workloads', tab: 13, category: 'Config & Storage', icon: <StorageIcon fontSize="small" sx={{ color: '#10b981' }} /> },
      { id: 'nav-pvs', title: 'PersistentVolumes (PV)', subtitle: 'Underlying physical and cloud persistent disk volumes', tab: 22, category: 'Config & Storage', icon: <StorageIcon fontSize="small" sx={{ color: '#059669' }} /> },
      { id: 'nav-storageclasses', title: 'Storage Classes', subtitle: 'Dynamic volume provisioners and retention profiles', tab: 14, category: 'Config & Storage', icon: <StorageIcon fontSize="small" sx={{ color: '#14b8a6' }} /> },

      // Cluster & Access
      { id: 'nav-nodes', title: 'Nodes Fleet', subtitle: 'Bare-metal & cloud worker node capacity and health', tab: 15, category: 'Cluster & Access', icon: <DnsIcon fontSize="small" sx={{ color: '#06b6d4' }} /> },
      { id: 'nav-serviceaccounts', title: 'Service Accounts', subtitle: 'In-cluster identities for workload automation', tab: 16, category: 'Cluster & Access', icon: <PeopleIcon fontSize="small" sx={{ color: '#8b5cf6' }} /> },
      { id: 'nav-roles', title: 'Roles & ClusterRoles', subtitle: 'RBAC resource permission rules and verbs', tab: 17, category: 'Cluster & Access', icon: <KeyIcon fontSize="small" sx={{ color: '#a855f7' }} /> },
      { id: 'nav-rolebindings', title: 'Role Bindings', subtitle: 'RBAC subject and group authorization assignments', tab: 18, category: 'Cluster & Access', icon: <LockPersonIcon fontSize="small" sx={{ color: '#d946ef' }} /> },
      { id: 'nav-hpa', title: 'Autoscalers (HPA)', subtitle: 'Horizontal Pod Autoscalers based on CPU and memory', tab: 21, category: 'Cluster & Access', icon: <SpeedIcon fontSize="small" sx={{ color: '#22c55e' }} /> },
      { id: 'nav-crds', title: 'Custom Resource Definitions (CRD)', subtitle: 'Custom operator schema extensions and custom resources', tab: 19, category: 'Cluster & Access', icon: <ExtensionIcon fontSize="small" sx={{ color: '#f97316' }} /> },
      { id: 'nav-events', title: 'Cluster Events', subtitle: 'Real-time warning and informational cluster event stream', tab: 20, category: 'Cluster & Access', icon: <NotificationsIcon fontSize="small" sx={{ color: '#eab308' }} /> },
    ];

    navItems.forEach((n) => {
      let resolvedAction = () => {
        onClose();
        onNavigateTab?.(n.tab);
      };
      if (n.tab === 27 && onOpenSettings) {
        resolvedAction = () => {
          onClose();
          onOpenSettings();
        };
      } else if (n.tab === 28 && onOpenPortForward) {
        resolvedAction = () => {
          onClose();
          onOpenPortForward();
        };
      } else if (n.tab === 29 && onOpenConfigDrift) {
        resolvedAction = () => {
          onClose();
          onOpenConfigDrift();
        };
      } else if (n.tab === 30 && onOpenDiff) {
        resolvedAction = () => {
          onClose();
          onOpenDiff();
        };
      } else if (n.tab === 31 && onOpenCostAllocation) {
        resolvedAction = () => {
          onClose();
          onOpenCostAllocation();
        };
      } else if (n.tab === 32 && onOpenSecurityPosture) {
        resolvedAction = () => {
          onClose();
          onOpenSecurityPosture();
        };
      }

      list.push({
        id: n.id,
        title: n.title,
        subtitle: n.subtitle,
        category: n.category,
        shortcut: n.shortcut,
        icon: n.icon,
        action: resolvedAction,
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
      id: 'action-clone-namespace',
      title: 'Clone Namespace & Export Multi-Doc YAML',
      subtitle: 'Duplicate environments, sanitize cluster metadata & export GitOps bundles',
      category: 'Actions',
      shortcut: 'Alt+N',
      icon: <DynamicFeedIcon fontSize="small" sx={{ color: '#38bdf8' }} />,
      action: () => {
        onClose();
        onOpenNamespaceCloner?.();
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
    onOpenDiff,
    onOpenConfigDrift,
    onOpenCostAllocation,
    onOpenSecurityPosture,
    onOpenNamespaceCloner,
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
