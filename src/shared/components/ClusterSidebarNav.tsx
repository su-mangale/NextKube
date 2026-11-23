'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Collapse,
  useTheme,
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
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import FolderZipRoundedIcon from '@mui/icons-material/FolderZipRounded';
import StoreRoundedIcon from '@mui/icons-material/StoreRounded';
import AutoAwesomeMotionRoundedIcon from '@mui/icons-material/AutoAwesomeMotionRounded';
import WidgetsRoundedIcon from '@mui/icons-material/WidgetsRounded';
import PublishedWithChangesRoundedIcon from '@mui/icons-material/PublishedWithChangesRounded';

export interface ClusterSidebarNavProps {
  activeTab: number;
  onSelectTab: (tabIndex: number) => void;
  onOpenSettings: () => void;
  onOpenCommandPalette?: () => void;
  onOpenPortForward?: () => void;
  onOpenDiff?: () => void;
  onOpenSecurityPosture?: () => void;
  resourceCounts?: Partial<Record<number, number>>;
  shortcutSettingsKey?: string;
  activePortForwardsCount?: number;
}

interface NavItemDef {
  tabIndex: number;
  label: string;
  icon: React.ReactElement;
  badge?: string;
  onClick?: () => void;
}

interface NavGroupDef {
  id: 'workloads' | 'networking' | 'storage' | 'cluster' | 'gitops';
  label: string;
  accentColor: string;
  items: NavItemDef[];
}

export function ClusterSidebarNav({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenCommandPalette: _onOpenCommandPalette,
  onOpenPortForward: _onOpenPortForward,
  onOpenConfigDrift: _onOpenConfigDrift,
  onOpenDiff: _onOpenDiff,
  onOpenSecurityPosture,
  resourceCounts: _resourceCounts = {},
  shortcutSettingsKey = 'Alt+,',
  activePortForwardsCount = 0,
}: ClusterSidebarNavProps & { onOpenConfigDrift?: () => void }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // State for collapsible groups with localStorage persistence
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    workloads: true,
    networking: true,
    storage: false,
    cluster: false,
    gitops: true,
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
      if ([8, 9, 10, 23, 28].includes(activeTab) && !next.networking) {
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
      if ([30, 33, 34, 35, 36, 37, 38, 39].includes(activeTab) && !next.gitops) {
        next.gitops = true;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [activeTab]);

  // Group definitions matching exact numerical tab indices with signature accent colors
  const groups: NavGroupDef[] = useMemo(
    () => [
      {
        id: 'workloads',
        label: 'Workloads',
        accentColor: '#0ea5e9',
        items: [
          { tabIndex: 2, label: 'Deployments', icon: <LayersRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 1, label: 'Pods', icon: <RocketLaunchRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 4, label: 'StatefulSets', icon: <StorageRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 3, label: 'DaemonSets', icon: <DnsRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 5, label: 'ReplicaSets', icon: <FileCopyRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 6, label: 'Jobs', icon: <TerminalRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 7, label: 'CronJobs', icon: <ScheduleRoundedIcon sx={{ fontSize: 16 }} /> },
        ],
      },
      {
        id: 'networking',
        label: 'Networking',
        accentColor: '#10b981',
        items: [
          { tabIndex: 8, label: 'Services', icon: <LanRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 9, label: 'Ingresses', icon: <LanguageRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 23, label: 'Gateway API', icon: <AltRouteRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 10, label: 'Network Policies', icon: <SecurityRoundedIcon sx={{ fontSize: 16 }} /> },
          {
            tabIndex: 28,
            label: 'Port Forwarding',
            icon: <AltRouteRoundedIcon sx={{ fontSize: 16 }} />,
            badge: activePortForwardsCount > 0 ? `${activePortForwardsCount} active` : undefined,
          },
        ],
      },
      {
        id: 'storage',
        label: 'Config & Storage',
        accentColor: '#f59e0b',
        items: [
          { tabIndex: 11, label: 'ConfigMaps', icon: <DescriptionRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 12, label: 'Secrets', icon: <KeyRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 13, label: 'PVCs', icon: <SdCardRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 22, label: 'Persistent Volumes', icon: <StorageRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 14, label: 'Storage Classes', icon: <FolderRoundedIcon sx={{ fontSize: 16 }} /> },
        ],
      },
      {
        id: 'cluster',
        label: 'Cluster & Access',
        accentColor: '#8b5cf6',
        items: [
          { tabIndex: 15, label: 'Nodes', icon: <ComputerRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 16, label: 'Service Accounts', icon: <PeopleRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 17, label: 'Roles', icon: <VpnKeyRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 18, label: 'Role Bindings', icon: <LockPersonRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 21, label: 'Autoscalers (HPA)', icon: <SpeedRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 19, label: 'Custom Resources', icon: <ExtensionRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 20, label: 'Events', icon: <NotificationsRoundedIcon sx={{ fontSize: 16 }} /> },
        ],
      },
      {
        id: 'gitops',
        label: 'GitOps (FluxCD)',
        accentColor: '#ec4899',
        items: [
          { tabIndex: 30, label: 'GitOps Overview', icon: <CompareArrowsRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 33, label: 'Git Sources (SOT)', icon: <GitHubIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 34, label: 'OCI Repositories', icon: <CloudQueueRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 35, label: 'Buckets (S3)', icon: <FolderZipRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 36, label: 'Helm Repositories', icon: <StoreRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 37, label: 'Kustomizations', icon: <AutoAwesomeMotionRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 38, label: 'Helm Releases (HR)', icon: <WidgetsRoundedIcon sx={{ fontSize: 16 }} /> },
          { tabIndex: 39, label: 'Image Automations', icon: <PublishedWithChangesRoundedIcon sx={{ fontSize: 16 }} /> },
        ],
      },
    ],
    [activePortForwardsCount]
  );

  const renderNavItem = (item: NavItemDef, isChild = false, customAccent?: string) => {
    const isSelected = activeTab === item.tabIndex;
    const accent = customAccent || (isDark ? '#38bdf8' : '#0284c7');

    const handleClick = () => {
      if (item.onClick) {
        item.onClick();
      } else {
        onSelectTab(item.tabIndex);
      }
    };

    return (
      <Box
        key={item.tabIndex}
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.25,
          py: 0.6,
          mx: isChild ? 0.5 : 1,
          my: 0.2,
          borderRadius: 2,
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          bgcolor: isSelected
            ? isDark
              ? 'rgba(56, 189, 248, 0.09)'
              : 'rgba(2, 132, 199, 0.07)'
            : 'transparent',
          border: isSelected
            ? `1px solid ${isDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(2, 132, 199, 0.18)'}`
            : '1px solid transparent',
          color: isSelected
            ? isDark
              ? '#f8fafc'
              : '#0f172a'
            : isDark
              ? 'rgba(226, 232, 240, 0.72)'
              : 'rgba(51, 65, 85, 0.85)',
          '&:hover': {
            bgcolor: isSelected
              ? isDark
                ? 'rgba(56, 189, 248, 0.14)'
                : 'rgba(2, 132, 199, 0.11)'
              : isDark
                ? 'rgba(255, 255, 255, 0.045)'
                : 'rgba(15, 23, 42, 0.04)',
            color: isSelected
              ? isDark
                ? '#ffffff'
                : '#0f172a'
              : isDark
                ? '#f8fafc'
                : '#0f172a',
            transform: isSelected ? 'none' : 'translateX(2px)',
            '& .nav-icon-container': {
              color: isSelected ? accent : isDark ? '#f8fafc' : '#0f172a',
              transform: 'scale(1.06)',
            },
          },
        }}
      >
        {/* Active subtle indicator notch */}
        {isSelected && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: '20%',
              bottom: '20%',
              width: 3,
              borderRadius: '0 4px 4px 0',
              bgcolor: accent,
              boxShadow: isDark ? `0 0 8px ${accent}` : `0 0 4px ${accent}40`,
            }}
          />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0, flexGrow: 1 }}>
          <Box
            className="nav-icon-container"
            sx={{
              width: 24,
              height: 24,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              bgcolor: isSelected
                ? isDark
                  ? `${accent}22`
                  : `${accent}16`
                : 'transparent',
              color: isSelected ? accent : isDark ? 'rgba(148, 163, 184, 0.8)' : 'rgba(100, 116, 139, 0.85)',
              transition: 'all 0.15s ease',
            }}
          >
            {item.icon}
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.8rem',
              fontWeight: isSelected ? 650 : 500,
              letterSpacing: '-0.012em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.label}
          </Typography>
        </Box>

        {/* Live Active Badge */}
        {item.badge && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
              px: 0.8,
              py: 0.2,
              borderRadius: 10,
              bgcolor: isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
            }}
          >
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: '#10b981',
                boxShadow: '0 0 6px #10b981',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(0.95)', opacity: 0.7 },
                  '50%': { transform: 'scale(1.3)', opacity: 1 },
                  '100%': { transform: 'scale(0.95)', opacity: 0.7 },
                },
                animation: 'pulse 1.8s infinite ease-in-out',
              }}
            />
            <Typography
              sx={{
                fontSize: '0.64rem',
                fontWeight: 700,
                color: isDark ? '#34d399' : '#059669',
                fontFamily: 'monospace',
                lineHeight: 1,
              }}
            >
              {item.badge}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: 248,
        minWidth: 248,
        maxWidth: 248,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(226, 232, 240, 0.9)'}`,
        bgcolor: isDark ? '#090d16' : '#fcfdfe',
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
          py: 0.75,
          scrollbarWidth: 'thin',
          scrollbarColor: isDark ? 'rgba(148, 163, 184, 0.15) transparent' : 'rgba(148, 163, 184, 0.2) transparent',
          '&:hover': {
            scrollbarColor: isDark ? 'rgba(148, 163, 184, 0.35) transparent' : 'rgba(148, 163, 184, 0.4) transparent',
          },
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.2)',
            borderRadius: '4px',
          },
          '&:hover::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.4)',
          },
        }}
      >
        {/* Top Platform Level Section */}
        <Box sx={{ px: 0.5, pt: 0.5, pb: 0.25 }}>
          {renderNavItem({
            tabIndex: 0,
            label: 'Overview',
            icon: <DashboardRoundedIcon sx={{ fontSize: 16 }} />,
          })}
          {renderNavItem({
            tabIndex: 26,
            label: 'Topology Map',
            icon: <HubRoundedIcon sx={{ fontSize: 16 }} />,
          })}
        </Box>

        {/* Subtle Horizontal Divider */}
        <Box
          sx={{
            my: 1,
            mx: 1.5,
            height: '1px',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(148, 163, 184, 0.16)',
          }}
        />

        {/* Categorized Collapsible Resource Groups */}
        {groups.map((group) => {
          const isExpanded = Boolean(expandedGroups[group.id]);

          return (
            <Box key={group.id} sx={{ mb: 0.5 }}>
              {/* Group Accordion Header */}
              <Box
                onClick={() => toggleGroup(group.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1.5,
                  py: 0.5,
                  mx: 1,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    '& .group-chevron': {
                      color: isDark ? '#cbd5e1' : '#475569',
                    },
                    '& .group-label': {
                      color: isDark ? '#e2e8f0' : '#334155',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: group.accentColor,
                      opacity: isExpanded ? 0.9 : 0.4,
                      transition: 'opacity 0.2s ease',
                    }}
                  />
                  <Typography
                    className="group-label"
                    sx={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: isDark
                        ? isExpanded ? '#cbd5e1' : '#64748b'
                        : isExpanded ? '#475569' : '#94a3b8',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {group.label}
                  </Typography>
                </Box>

                <ChevronRightRoundedIcon
                  className="group-chevron"
                  sx={{
                    fontSize: 15,
                    color: isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.5)',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease',
                  }}
                />
              </Box>

              {/* Group Items Container with Vertical Guide Rail */}
              <Collapse in={isExpanded} timeout={180} unmountOnExit={false}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    ml: 2.2,
                    pl: 0.5,
                    my: 0.25,
                    borderLeft: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(148, 163, 184, 0.22)'}`,
                  }}
                >
                  {group.items.map((item) => renderNavItem(item, true, group.accentColor))}
                </Box>
              </Collapse>
            </Box>
          );
        })}

        {/* Subtle Horizontal Divider */}
        <Box
          sx={{
            my: 1,
            mx: 1.5,
            height: '1px',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(148, 163, 184, 0.16)',
          }}
        />

        {/* Platform & Tools Section */}
        <Box sx={{ mb: 0.5, px: 0.5 }}>
          <Box sx={{ px: 1.5, py: 0.4, mb: 0.2 }}>
            <Typography
              sx={{
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isDark ? '#64748b' : '#94a3b8',
              }}
            >
              Platform & Tools
            </Typography>
          </Box>

          {renderNavItem({
            tabIndex: 25,
            label: 'Helm App Store',
            icon: <StorefrontRoundedIcon sx={{ fontSize: 16 }} />,
          })}
          {renderNavItem({
            tabIndex: 24,
            label: 'Audit Trail',
            icon: <HistoryRoundedIcon sx={{ fontSize: 16 }} />,
          })}
          {renderNavItem(
            {
              tabIndex: 32,
              label: 'Security & CIS Audit',
              icon: <SecurityRoundedIcon sx={{ fontSize: 16, color: activeTab === 32 ? '#f87171' : '#ef4444' }} />,
              onClick: onOpenSecurityPosture ? onOpenSecurityPosture : () => onSelectTab(32),
            },
            false,
            '#ef4444'
          )}
        </Box>
      </Box>

      {/* Pinned Bottom Footer Tile: Settings & Preferences */}
      <Box
        sx={{
          p: 1.2,
          borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(226, 232, 240, 0.85)'}`,
          bgcolor: isDark ? 'rgba(11, 15, 25, 0.7)' : 'rgba(248, 250, 252, 0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Box
          onClick={() => {
            if (onOpenSettings) onOpenSettings();
            else onSelectTab(27);
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.25,
            py: 0.75,
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 0.16s ease',
            bgcolor: activeTab === 27
              ? isDark
                ? 'rgba(56, 189, 248, 0.12)'
                : 'rgba(2, 132, 199, 0.08)'
              : isDark
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(255, 255, 255, 0.8)',
            border: `1px solid ${
              activeTab === 27
                ? isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.2)'
                : isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
            }`,
            color: activeTab === 27
              ? isDark ? '#ffffff' : '#0f172a'
              : isDark ? 'rgba(226, 232, 240, 0.85)' : 'rgba(51, 65, 85, 0.9)',
            boxShadow: isDark
              ? '0 2px 4px rgba(0, 0, 0, 0.2)'
              : '0 1px 3px rgba(0, 0, 0, 0.04)',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
              boxShadow: isDark
                ? '0 4px 8px rgba(0, 0, 0, 0.3)'
                : '0 2px 6px rgba(0, 0, 0, 0.06)',
              '& .settings-gear-icon': {
                transform: 'rotate(60deg)',
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                color: isDark ? '#38bdf8' : '#0284c7',
              }}
            >
              <SettingsRoundedIcon
                className="settings-gear-icon"
                sx={{
                  fontSize: 16,
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.82rem',
                fontWeight: activeTab === 27 ? 700 : 600,
                letterSpacing: '-0.01em',
              }}
            >
              Settings
            </Typography>
          </Box>

          {shortcutSettingsKey && (
            <Box
              sx={{
                px: 0.75,
                py: 0.15,
                borderRadius: 1,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.62rem',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: 'text.secondary',
                  lineHeight: 1.3,
                }}
              >
                {shortcutSettingsKey}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
