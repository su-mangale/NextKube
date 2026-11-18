'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Divider,
  Collapse,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import FileCopyRoundedIcon from '@mui/icons-material/FileCopyRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import LanRoundedIcon from '@mui/icons-material/LanRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import AltRouteRoundedIcon from '@mui/icons-material/AltRouteRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import SdCardRoundedIcon from '@mui/icons-material/SdCardRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import ComputerRoundedIcon from '@mui/icons-material/ComputerRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import LockPersonRoundedIcon from '@mui/icons-material/LockPersonRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import ExtensionRoundedIcon from '@mui/icons-material/ExtensionRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';

export interface ClusterSidebarNavProps {
  activeTab: number;
  onSelectTab: (tabIndex: number) => void;
  onOpenSettings: () => void;
  onOpenCommandPalette?: () => void;
  resourceCounts?: Partial<Record<number, number>>;
  shortcutSettingsKey?: string;
}

interface NavItemDef {
  tabIndex: number;
  label: string;
  icon: React.ReactElement;
  badge?: string;
}

interface NavGroupDef {
  id: 'workloads' | 'networking' | 'storage' | 'cluster';
  label: string;
  items: NavItemDef[];
}

export function ClusterSidebarNav({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenCommandPalette,
  resourceCounts = {},
  shortcutSettingsKey = 'Alt+,',
}: ClusterSidebarNavProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // State for collapsible groups with localStorage persistence
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    workloads: true,
    networking: true,
    storage: false,
    cluster: false,
  });

  // Load saved group collapse state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nextkube-sidebar-groups');
        if (saved) {
          const parsed = JSON.parse(saved);
          setExpandedGroups((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // Fall back to default state
      }
    }
  }, []);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('nextkube-sidebar-groups', JSON.stringify(next));
        } catch {
          // ignore storage error
        }
      }
      return next;
    });
  };

  // Auto-expand group if active tab belongs to a collapsed group
  useEffect(() => {
    setExpandedGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      if ([1, 2, 3, 4, 5, 6, 7].includes(activeTab) && !next.workloads) {
        next.workloads = true;
        changed = true;
      }
      if ([8, 9, 10, 23].includes(activeTab) && !next.networking) {
        next.networking = true;
        changed = true;
      }
      if ([11, 12, 13, 14, 22].includes(activeTab) && !next.storage) {
        next.storage = true;
        changed = true;
      }
      if ([15, 16, 17, 18, 19, 20, 21].includes(activeTab) && !next.cluster) {
        next.cluster = true;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [activeTab]);

  // Group definitions matching exact numerical tab indices
  const groups: NavGroupDef[] = useMemo(
    () => [
      {
        id: 'workloads',
        label: 'Workloads',
        items: [
          { tabIndex: 2, label: 'Deployments', icon: <LayersRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 1, label: 'Pods', icon: <RocketLaunchRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 4, label: 'StatefulSets', icon: <StorageRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 3, label: 'DaemonSets', icon: <DnsRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 5, label: 'ReplicaSets', icon: <FileCopyRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 6, label: 'Jobs', icon: <TerminalRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 7, label: 'CronJobs', icon: <ScheduleRoundedIcon sx={{ fontSize: 18 }} /> },
        ],
      },
      {
        id: 'networking',
        label: 'Networking',
        items: [
          { tabIndex: 8, label: 'Services', icon: <LanRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 9, label: 'Ingresses', icon: <LanguageRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 23, label: 'Gateway API', icon: <AltRouteRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 10, label: 'Network Policies', icon: <SecurityRoundedIcon sx={{ fontSize: 18 }} /> },
        ],
      },
      {
        id: 'storage',
        label: 'Config & Storage',
        items: [
          { tabIndex: 11, label: 'ConfigMaps', icon: <DescriptionRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 12, label: 'Secrets', icon: <KeyRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 13, label: 'PVCs', icon: <SdCardRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 22, label: 'Persistent Volumes', icon: <StorageRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 14, label: 'Storage Classes', icon: <FolderRoundedIcon sx={{ fontSize: 18 }} /> },
        ],
      },
      {
        id: 'cluster',
        label: 'Cluster & Access',
        items: [
          { tabIndex: 15, label: 'Nodes', icon: <ComputerRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 16, label: 'Service Accounts', icon: <PeopleRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 17, label: 'Roles', icon: <VpnKeyRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 18, label: 'Role Bindings', icon: <LockPersonRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 21, label: 'Autoscalers (HPA)', icon: <SpeedRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 19, label: 'Custom Resources', icon: <ExtensionRoundedIcon sx={{ fontSize: 18 }} /> },
          { tabIndex: 20, label: 'Events', icon: <NotificationsRoundedIcon sx={{ fontSize: 18 }} /> },
        ],
      },
    ],
    []
  );

  const renderNavItem = (item: NavItemDef, isChild = false) => {
    const isSelected = activeTab === item.tabIndex;
    const count = resourceCounts[item.tabIndex];

    return (
      <Box
        key={item.tabIndex}
        onClick={() => onSelectTab(item.tabIndex)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: isChild ? 2 : 1.5,
          pl: isChild ? 3 : 1.5,
          py: 0.65,
          mx: 1,
          my: 0.2,
          borderRadius: 1.8,
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.16s ease',
          bgcolor: isSelected
            ? isDark
              ? alpha(theme.palette.primary.main, 0.22)
              : alpha(theme.palette.primary.main, 0.12)
            : 'transparent',
          color: isSelected
            ? theme.palette.primary.main
            : isDark
              ? 'rgba(241, 245, 249, 0.82)'
              : 'rgba(30, 41, 59, 0.85)',
          '&:hover': {
            bgcolor: isSelected
              ? isDark
                ? alpha(theme.palette.primary.main, 0.28)
                : alpha(theme.palette.primary.main, 0.18)
              : isDark
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.04)',
            color: isSelected
              ? theme.palette.primary.main
              : isDark
                ? '#ffffff'
                : '#0f172a',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isSelected ? theme.palette.primary.main : 'text.secondary',
              transition: 'color 0.15s ease',
            }}
          >
            {item.icon}
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.81rem',
              fontWeight: isSelected ? 750 : 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.label}
          </Typography>
        </Box>

        {/* Live count chip or badge */}
        {count !== undefined && (
          <Chip
            label={count}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.66rem',
              fontWeight: 700,
              px: 0.2,
              bgcolor: isSelected
                ? isDark
                  ? alpha(theme.palette.primary.main, 0.35)
                  : alpha(theme.palette.primary.main, 0.2)
                : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
              color: isSelected ? theme.palette.primary.main : 'text.secondary',
              borderRadius: 1,
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: 240,
        minWidth: 240,
        maxWidth: 240,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.85)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Scrollable Navigation Items */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1,
          scrollbarWidth: 'thin',
          scrollbarColor: isDark ? 'rgba(148, 163, 184, 0.3) transparent' : 'rgba(148, 163, 184, 0.25) transparent',
          '&::-webkit-scrollbar': {
            width: '5px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.25)',
            borderRadius: '4px',
          },
        }}
      >
        {/* Top Platform Level Items: Overview & Topology */}
        {renderNavItem({
          tabIndex: 0,
          label: 'Overview',
          icon: <DashboardRoundedIcon sx={{ fontSize: 18 }} />,
        })}
        {renderNavItem({
          tabIndex: 26,
          label: 'Topology Map',
          icon: <HubRoundedIcon sx={{ fontSize: 18 }} />,
        })}

        <Box sx={{ my: 1, mx: 1.5 }}>
          <Divider sx={{ opacity: 0.6 }} />
        </Box>

        {/* Categorized Collapsible Groups */}
        {groups.map((group) => {
          const isExpanded = Boolean(expandedGroups[group.id]);
          const groupCount = group.items.reduce((acc, curr) => acc + (resourceCounts[curr.tabIndex] || 0), 0);

          return (
            <Box key={group.id} sx={{ mb: 0.8 }}>
              {/* Group Accordion Header */}
              <Box
                onClick={() => toggleGroup(group.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1.5,
                  py: 0.5,
                  mx: 0.8,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  color: 'text.secondary',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    color: isDark ? '#f8fafc' : '#0f172a',
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {group.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {groupCount > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'text.disabled',
                      }}
                    >
                      {groupCount}
                    </Typography>
                  )}
                  {isExpanded ? (
                    <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  ) : (
                    <ChevronRightRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  )}
                </Box>
              </Box>

              {/* Group Items Collapse Container */}
              <Collapse in={isExpanded} timeout="auto" unmountOnExit={false}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {group.items.map((item) => renderNavItem(item, true))}
                </Box>
              </Collapse>
            </Box>
          );
        })}

        <Box sx={{ my: 1, mx: 1.5 }}>
          <Divider sx={{ opacity: 0.6 }} />
        </Box>

        {/* Standalone Platform Items */}
        {renderNavItem({
          tabIndex: 25,
          label: 'Helm App Store',
          icon: <StorefrontRoundedIcon sx={{ fontSize: 18 }} />,
        })}
        {renderNavItem({
          tabIndex: 24,
          label: 'Audit Trail',
          icon: <HistoryRoundedIcon sx={{ fontSize: 18 }} />,
        })}
      </Box>

      {/* Pinned Bottom Footer: Settings & Quick Omnibar Launcher */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(241, 245, 249, 0.9)',
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.6,
        }}
      >
        {/* Settings Launcher */}
        <Box
          onClick={onOpenSettings}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.8,
            borderRadius: 1.8,
            cursor: 'pointer',
            transition: 'all 0.16s ease',
            color: isDark ? 'rgba(241, 245, 249, 0.9)' : 'rgba(30, 41, 59, 0.9)',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              '& .settings-icon': {
                transform: 'rotate(45deg)',
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <SettingsRoundedIcon
              className="settings-icon"
              sx={{
                fontSize: 18,
                color: theme.palette.primary.main,
                transition: 'transform 0.25s ease',
              }}
            />
            <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
              Settings
            </Typography>
          </Box>
          <Chip
            label={shortcutSettingsKey}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.62rem',
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              borderRadius: 1,
            }}
          />
        </Box>

        {/* Command Palette Launcher Pill */}
        {onOpenCommandPalette && (
          <Box
            onClick={onOpenCommandPalette}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.5,
              py: 0.6,
              borderRadius: 1.5,
              cursor: 'pointer',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.16s ease',
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.06)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontSize: '0.74rem', color: 'text.secondary', fontWeight: 600 }}>
                Command Palette
              </Typography>
            </Box>
            <Chip
              label="⌘K"
              size="small"
              sx={{
                height: 17,
                fontSize: '0.62rem',
                fontWeight: 800,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                borderRadius: 0.8,
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
