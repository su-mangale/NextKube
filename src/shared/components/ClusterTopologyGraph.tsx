'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Button,
  Tooltip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  CircularProgress,
  Drawer,
  Divider,
  Switch,
  FormControlLabel,
  useTheme,
  alpha,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import PublicIcon from '@mui/icons-material/Public';
import LanIcon from '@mui/icons-material/Lan';
import WidgetsIcon from '@mui/icons-material/Widgets';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import DnsIcon from '@mui/icons-material/Dns';
import MemoryIcon from '@mui/icons-material/Memory';
import ComputerIcon from '@mui/icons-material/Computer';
import StorageIcon from '@mui/icons-material/Storage';
import TerminalIcon from '@mui/icons-material/Terminal';
import ArticleIcon from '@mui/icons-material/Article';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloseIcon from '@mui/icons-material/Close';
import HubIcon from '@mui/icons-material/Hub';
import { useClusterTopology } from '../api/dashboard.api';
import { TopologyNode, TopologyEdge, TopologyKind } from '../types/dashboard.types';

export interface ClusterTopologyGraphProps {
  clusterId: string;
  initialNamespace?: string;
  availableNamespaces?: string[];
  onOpenLogs?: (resource: any, kind: string) => void;
  onOpenExec?: (resource: any) => void;
  onViewYaml?: (resource: any) => void;
  onScale?: (resource: any) => void;
  onRestart?: (resource: any) => void;
}

interface LayoutNode extends TopologyNode {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsedPods?: TopologyNode[];
}

const NODE_WIDTH = 230;
const NODE_HEIGHT = 80;
const TIER_SPACING_X = 320;
const NODE_SPACING_Y = 100;

export default function ClusterTopologyGraph({
  clusterId,
  initialNamespace = 'all',
  availableNamespaces = [],
  onOpenLogs,
  onOpenExec,
  onViewYaml,
  onScale,
  onRestart,
}: ClusterTopologyGraphProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [selectedNamespace, setSelectedNamespace] = useState<string>(initialNamespace);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [groupReplicas, setGroupReplicas] = useState<boolean>(true);

  // Filter visibility toggles
  const [visibleKinds, setVisibleKinds] = useState<Record<TopologyKind, boolean>>({
    Ingress: true,
    Gateway: true,
    Service: true,
    Deployment: true,
    StatefulSet: true,
    DaemonSet: true,
    Job: true,
    Pod: true,
    Node: true,
    PVC: true,
    ConfigMap: true,
    Secret: true,
  });

  // Canvas viewport (pan & zoom)
  const [transform, setTransform] = useState<{ x: number; y: number; k: number }>({ x: 80, y: 60, k: 0.95 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: topologyData, isLoading } = useClusterTopology(clusterId, selectedNamespace);

  // Sync initialNamespace if it changes from parent
  useEffect(() => {
    if (initialNamespace) {
      setSelectedNamespace(initialNamespace);
    }
  }, [initialNamespace]);

  // Handle Pan and Zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.interactive-node-element')) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newK = Math.min(Math.max(transform.k * zoomFactor, 0.25), 2.5);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform((prev) => ({
      k: newK,
      x: mouseX - (mouseX - prev.x) * (newK / prev.k),
      y: mouseY - (mouseY - prev.y) * (newK / prev.k),
    }));
  };

  const handleZoomIn = () => {
    setTransform((prev) => ({ ...prev, k: Math.min(prev.k * 1.2, 2.5) }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({ ...prev, k: Math.max(prev.k / 1.2, 0.25) }));
  };

  const handleResetZoom = () => {
    setTransform({ x: 80, y: 60, k: 1 });
  };

  const toggleKind = (kind: TopologyKind) => {
    setVisibleKinds((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  // Compute Layout Positions
  const { layoutNodes, layoutEdges, bounds } = useMemo(() => {
    if (!topologyData || !topologyData.nodes.length) {
      return { layoutNodes: [], layoutEdges: [], bounds: { minX: 0, maxX: 1000, minY: 0, maxY: 600 } };
    }

    const rawNodes = topologyData.nodes.filter((n) => visibleKinds[n.kind]);
    const rawEdges = topologyData.edges;

    let processedNodes: LayoutNode[] = [];
    const nodeLookup = new Map<string, LayoutNode>();

    if (groupReplicas) {
      const workloadToPods = new Map<string, TopologyNode[]>();
      const standalonePods: TopologyNode[] = [];

      const podOwnerMap = new Map<string, string>();
      rawEdges.forEach((e) => {
        if (e.relation === 'manages') {
          podOwnerMap.set(e.target, e.source);
        }
      });

      rawNodes.forEach((node) => {
        if (node.kind === 'Pod') {
          const ownerWorkloadId = podOwnerMap.get(node.id);
          if (ownerWorkloadId) {
            const list = workloadToPods.get(ownerWorkloadId) || [];
            list.push(node);
            workloadToPods.set(ownerWorkloadId, list);
          } else {
            standalonePods.push(node);
          }
        }
      });

      rawNodes.forEach((node) => {
        if (node.kind !== 'Pod') {
          const ln: LayoutNode = {
            ...node,
            x: 0,
            y: 0,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          };
          processedNodes.push(ln);
          nodeLookup.set(ln.id, ln);
        }
      });

      standalonePods.forEach((pod) => {
        const ln: LayoutNode = {
          ...pod,
          x: 0,
          y: 0,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        };
        processedNodes.push(ln);
        nodeLookup.set(ln.id, ln);
      });

      workloadToPods.forEach((pods, workloadId) => {
        if (pods.length === 1) {
          const ln: LayoutNode = {
            ...pods[0],
            x: 0,
            y: 0,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          };
          processedNodes.push(ln);
          nodeLookup.set(ln.id, ln);
        } else if (pods.length > 1) {
          const first = pods[0];
          const hasError = pods.some((p) => p.status === 'Error');
          const hasWarning = pods.some((p) => p.status === 'Warning');
          const status = hasError ? 'Error' : hasWarning ? 'Warning' : 'Healthy';
          const aggregatedId = `group:${workloadId}:pods`;

          const ln: LayoutNode = {
            id: aggregatedId,
            kind: 'Pod',
            name: `${first.name.replace(/-[a-z0-9]+-[a-z0-9]+$/, '')} (${pods.length} Replicas)`,
            namespace: first.namespace,
            status,
            detail: `${pods.filter((p) => p.status === 'Healthy').length}/${pods.length} Healthy`,
            tier: 3,
            podCount: pods.length,
            collapsedPods: pods,
            x: 0,
            y: 0,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          };
          processedNodes.push(ln);
          nodeLookup.set(aggregatedId, ln);

          pods.forEach((p) => {
            nodeLookup.set(p.id, ln);
          });
        }
      });
    } else {
      processedNodes = rawNodes.map((n) => {
        const ln: LayoutNode = {
          ...n,
          x: 0,
          y: 0,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        };
        nodeLookup.set(ln.id, ln);
        return ln;
      });
    }

    const tiers: LayoutNode[][] = [[], [], [], [], []];
    processedNodes.forEach((n) => {
      const t = Math.min(Math.max(n.tier, 0), 4);
      tiers[t].push(n);
    });

    const maxTierCount = Math.max(...tiers.map((t) => t.length), 1);
    const totalMaxHeight = maxTierCount * NODE_SPACING_Y;

    tiers.forEach((tierNodes, tierIdx) => {
      const tierHeight = tierNodes.length * NODE_SPACING_Y;
      const startY = Math.max(0, (totalMaxHeight - tierHeight) / 2);

      tierNodes.forEach((node, nodeIdx) => {
        node.x = tierIdx * TIER_SPACING_X + 40;
        node.y = startY + nodeIdx * NODE_SPACING_Y + 40;
      });
    });

    const processedEdges: (TopologyEdge & { sourceNode: LayoutNode; targetNode: LayoutNode })[] = [];
    const edgeKeySet = new Set<string>();

    rawEdges.forEach((e) => {
      const srcNode = nodeLookup.get(e.source);
      const tgtNode = nodeLookup.get(e.target);
      if (srcNode && tgtNode && srcNode.id !== tgtNode.id) {
        const key = `${srcNode.id}->${tgtNode.id}`;
        if (!edgeKeySet.has(key)) {
          edgeKeySet.add(key);
          processedEdges.push({
            ...e,
            sourceNode: srcNode,
            targetNode: tgtNode,
          });
        }
      }
    });

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    processedNodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + n.width);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + n.height);
    });

    if (minX === Infinity) {
      minX = 0;
      maxX = 1000;
      minY = 0;
      maxY = 600;
    }

    return {
      layoutNodes: processedNodes,
      layoutEdges: processedEdges,
      bounds: { minX, maxX: maxX + 100, minY, maxY: maxY + 100 },
    };
  }, [topologyData, visibleKinds, groupReplicas]);

  // Fit View
  const handleFitView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 1200;
    const height = rect.height || 700;

    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;

    if (graphWidth <= 0 || graphHeight <= 0) return;

    const scaleX = (width - 120) / graphWidth;
    const scaleY = (height - 120) / graphHeight;
    const k = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.2);

    const x = (width - graphWidth * k) / 2 - bounds.minX * k;
    const y = (height - graphHeight * k) / 2 - bounds.minY * k;

    setTransform({ x, y, k });
  }, [bounds]);

  useEffect(() => {
    if (layoutNodes.length > 0) {
      const timer = setTimeout(() => {
        handleFitView();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [layoutNodes.length, selectedNamespace, handleFitView]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return layoutNodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, layoutNodes]);

  const connectedNodeIds = useMemo(() => {
    const activeId = hoveredNodeId || selectedNodeId;
    if (!activeId) return null;
    const ids = new Set<string>([activeId]);
    layoutEdges.forEach((e) => {
      if (e.sourceNode.id === activeId) ids.add(e.targetNode.id);
      if (e.targetNode.id === activeId) ids.add(e.sourceNode.id);
    });
    return ids;
  }, [hoveredNodeId, selectedNodeId, layoutEdges]);

  const getKindIcon = (kind: TopologyKind) => {
    switch (kind) {
      case 'Ingress':
      case 'Gateway':
        return <PublicIcon sx={{ fontSize: 18, color: '#06b6d4' }} />;
      case 'Service':
        return <LanIcon sx={{ fontSize: 18, color: '#3b82f6' }} />;
      case 'Deployment':
        return <WidgetsIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />;
      case 'DaemonSet':
        return <AllInclusiveIcon sx={{ fontSize: 18, color: '#ec4899' }} />;
      case 'StatefulSet':
        return <DnsIcon sx={{ fontSize: 18, color: '#10b981' }} />;
      case 'Pod':
        return <MemoryIcon sx={{ fontSize: 18, color: '#f59e0b' }} />;
      case 'Node':
        return <ComputerIcon sx={{ fontSize: 18, color: '#64748b' }} />;
      case 'PVC':
        return <StorageIcon sx={{ fontSize: 18, color: '#14b8a6' }} />;
      default:
        return <HubIcon sx={{ fontSize: 18, color: '#3b82f6' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy':
      case 'Bound':
      case 'Running':
        return '#10b981';
      case 'Warning':
      case 'Pending':
        return '#f59e0b';
      case 'Error':
      case 'CrashLoop':
      case 'Failed':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        width: '100%',
        height: isFullscreen ? '100vh' : 'calc(100vh - 180px)',
        minHeight: 640,
        zIndex: isFullscreen ? 9999 : 1,
        bgcolor: isDark ? '#0b1120' : '#f8fafc',
        borderRadius: isFullscreen ? 0 : 2,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* TOP CONTROL BAR */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          px: 2.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          zIndex: 10,
        }}
      >
        {/* Left: Title & Namespace Selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HubIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: -0.2 }}>
              Visual Topology Map
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              displayEmpty
              sx={{
                fontSize: '0.8rem',
                borderRadius: 1.5,
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <MenuItem value="all">All Namespaces</MenuItem>
              {availableNamespaces.map((ns) => (
                <MenuItem key={ns} value={ns}>
                  {ns}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {topologyData?.summary && (
            <Chip
              size="small"
              label={`${topologyData.summary.totalNodes} Nodes · ${topologyData.summary.totalEdges} Links`}
              sx={{
                fontSize: '0.72rem',
                fontWeight: 600,
                bgcolor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                color: theme.palette.primary.main,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            />
          )}
        </Box>

        {/* Center: Search Box & Group Replicas Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search resource or image..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiInputBase-root': { fontSize: '0.8rem', borderRadius: 1.5, width: 220 },
            }}
          />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={groupReplicas}
                onChange={(e) => setGroupReplicas(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Group Replicas
              </Typography>
            }
          />
        </Box>

        {/* Right: Actions & Zoom Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Tooltip title="Zoom In (+)">
            <IconButton size="small" onClick={handleZoomIn} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out (-)">
            <IconButton size="small" onClick={handleZoomOut} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fit View to Screen">
            <IconButton size="small" onClick={handleFitView} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <FitScreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Zoom (100%)">
            <IconButton size="small" onClick={handleResetZoom} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />

          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}>
            <IconButton
              size="small"
              onClick={() => setIsFullscreen(!isFullscreen)}
              sx={{ border: `1px solid ${theme.palette.divider}` }}
            >
              {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* FILTER CHIPS ROW */}
      <Box
        sx={{
          px: 2.5,
          py: 0.8,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          overflowX: 'auto',
          zIndex: 9,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mr: 0.5, fontSize: '0.65rem' }}>
          Layers:
        </Typography>

        {(['Ingress', 'Service', 'Deployment', 'DaemonSet', 'StatefulSet', 'Pod', 'Node', 'PVC'] as TopologyKind[]).map((kind) => {
          const isVisible = visibleKinds[kind];
          return (
            <Chip
              key={kind}
              size="small"
              icon={getKindIcon(kind)}
              label={kind}
              onClick={() => toggleKind(kind)}
              variant={isVisible ? 'filled' : 'outlined'}
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                opacity: isVisible ? 1 : 0.45,
                borderColor: isVisible ? 'transparent' : theme.palette.divider,
                bgcolor: isVisible
                  ? isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.06)'
                  : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            />
          );
        })}

        <Box sx={{ flexGrow: 1 }} />

        {/* Legend status dots */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Healthy</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Degraded</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Error</Typography>
          </Box>
        </Box>
      </Box>

      {/* INTERACTIVE CANVAS AREA */}
      <Box
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        sx={{
          flexGrow: 1,
          position: 'relative',
          cursor: isPanning ? 'grabbing' : 'grab',
          overflow: 'hidden',
          backgroundImage: isDark
            ? 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)'
            : 'radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              bgcolor: isDark ? 'rgba(11, 17, 32, 0.7)' : 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 20,
            }}
          >
            <CircularProgress size={36} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Building cluster topology graph...
            </Typography>
          </Box>
        )}

        {!isLoading && layoutNodes.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <HubIcon sx={{ fontSize: 54, color: 'text.disabled' }} />
            <Typography variant="h6" color="text.secondary">
              No resources found in namespace &ldquo;{selectedNamespace}&rdquo;
            </Typography>
            <Button variant="outlined" size="small" onClick={() => setSelectedNamespace('all')}>
              View All Namespaces
            </Button>
          </Box>
        )}

        {/* TRANSFORMed SVG & HTML CANVAS */}
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {/* SVG Connection Lines */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: bounds.maxX + 400,
              height: bounds.maxY + 400,
              overflow: 'visible',
              pointerEvents: 'none',
            }}
          >
            <defs>
              <linearGradient id="grad-active" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="grad-error" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="grad-warning" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#eab308" stopOpacity="0.8" />
              </linearGradient>

              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill={isDark ? '#64748b' : '#94a3b8'} />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#3b82f6" />
              </marker>
              <marker id="arrow-warning" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
              </marker>
              <marker id="arrow-error" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444" />
              </marker>
            </defs>

            {layoutEdges.map((edge) => {
              const src = edge.sourceNode;
              const tgt = edge.targetNode;

              const x1 = src.x + src.width;
              const y1 = src.y + src.height / 2;
              const x2 = tgt.x;
              const y2 = tgt.y + tgt.height / 2;

              const dx = Math.max(Math.abs(x2 - x1) * 0.5, 40);
              const cx1 = x1 + dx;
              const cy1 = y1;
              const cx2 = x2 - dx;
              const cy2 = y2;
              const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

              const isHighlighted =
                connectedNodeIds === null ||
                (connectedNodeIds.has(src.id) && connectedNodeIds.has(tgt.id));

              const isError = edge.status === 'error' || src.status === 'Error' || tgt.status === 'Error';
              const isWarning = edge.status === 'warning' || src.status === 'Warning' || tgt.status === 'Warning';

              let strokeColor = isDark ? 'rgba(100, 116, 139, 0.4)' : 'rgba(148, 163, 184, 0.5)';
              let marker = 'url(#arrow)';

              if (isHighlighted && (hoveredNodeId || selectedNodeId)) {
                if (isError) {
                  strokeColor = 'url(#grad-error)';
                  marker = 'url(#arrow-error)';
                } else if (isWarning) {
                  strokeColor = 'url(#grad-warning)';
                  marker = 'url(#arrow-warning)';
                } else {
                  strokeColor = 'url(#grad-active)';
                  marker = 'url(#arrow-active)';
                }
              }

              return (
                <g key={edge.id} opacity={isHighlighted ? 1 : 0.15} style={{ transition: 'opacity 0.2s ease' }}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isHighlighted && (hoveredNodeId || selectedNodeId) ? 2.8 : 1.8}
                    strokeDasharray={isError ? '5,5' : 'none'}
                    markerEnd={marker}
                  />

                  {isHighlighted && (
                    <circle r="3" fill="#38bdf8">
                      <animateMotion dur="2.8s" repeatCount="indefinite" path={pathD} />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* HTML NODE CARDS */}
          {layoutNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isHighlighted =
              connectedNodeIds === null || connectedNodeIds.has(node.id);

            const matchesSearch =
              !searchQuery.trim() ||
              node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (node.image && node.image.toLowerCase().includes(searchQuery.toLowerCase()));

            const statusColor = getStatusColor(node.status);

            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                  pointerEvents: 'auto',
                  opacity: !matchesSearch ? 0.2 : isHighlighted ? 1 : 0.25,
                  transform: isHovered || isSelected ? 'scale(1.03)' : 'scale(1)',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: isSelected ? 30 : isHovered ? 25 : 15,
                }}
                className="interactive-node-element"
                onClick={() => setSelectedNodeId(node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                <Paper
                  elevation={isSelected ? 6 : isHovered ? 3 : 1}
                  sx={{
                    width: '100%',
                    height: '100%',
                    p: 1.2,
                    boxSizing: 'border-box',
                    borderRadius: 2,
                    bgcolor: isDark
                      ? isSelected
                        ? 'rgba(30, 41, 59, 0.98)'
                        : 'rgba(15, 23, 42, 0.9)'
                      : isSelected
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: `1.5px solid ${
                      isSelected
                        ? theme.palette.primary.main
                        : isHovered
                        ? alpha(theme.palette.primary.main, 0.5)
                        : theme.palette.divider
                    }`,
                    boxShadow: isSelected
                      ? `0 0 16px ${alpha(theme.palette.primary.main, 0.35)}`
                      : undefined,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Card Header: Icon + Kind + Status Pulse */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                      {getKindIcon(node.kind)}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {node.kind}
                      </Typography>
                    </Box>

                    <Tooltip title={`Status: ${node.status}`}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: statusColor,
                          boxShadow: `0 0 6px ${statusColor}`,
                        }}
                      />
                    </Tooltip>
                  </Box>

                  {/* Card Body: Name */}
                  <Tooltip title={node.name}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: isDark ? '#f8fafc' : '#0f172a',
                      }}
                    >
                      {node.name}
                    </Typography>
                  </Tooltip>

                  {/* Card Footer: Detail / Metrics + Namespace */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.68rem',
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 130,
                      }}
                    >
                      {node.detail || '-'}
                    </Typography>

                    {node.namespace && (
                      <Chip
                        size="small"
                        label={node.namespace}
                        sx={{
                          height: 16,
                          fontSize: '0.62rem',
                          fontWeight: 600,
                          borderRadius: 0.8,
                          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        }}
                      />
                    )}
                  </Box>
                </Paper>
              </div>
            );
          })}
        </div>

        {/* MINIMAP RADAR (Bottom Right) */}
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            width: 140,
            height: 90,
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: 1.5,
            border: `1px solid ${theme.palette.divider}`,
            overflow: 'hidden',
            p: 0.5,
            pointerEvents: 'none',
            display: { xs: 'none', sm: 'block' },
            zIndex: 10,
          }}
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${bounds.maxX || 1200} ${bounds.maxY || 800}`}>
            {layoutNodes.map((n) => (
              <rect
                key={n.id}
                x={n.x}
                y={n.y}
                width={n.width}
                height={n.height}
                fill={getStatusColor(n.status)}
                rx={4}
                opacity={0.7}
              />
            ))}
          </svg>
        </Paper>
      </Box>

      {/* INSPECTOR SLIDE-OUT DRAWER */}
      <Drawer
        anchor="right"
        open={Boolean(selectedNode)}
        onClose={() => setSelectedNodeId(null)}
        variant="temporary"
        slotProps={{
          paper: {
            sx: {
              width: { xs: 320, sm: 380 },
              p: 2.5,
              bgcolor: isDark ? '#0f172a' : '#ffffff',
              boxShadow: theme.shadows[16],
            },
          },
        }}
      >
        {selectedNode && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getKindIcon(selectedNode.kind)}
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedNode.kind}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedNodeId(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Typography
              variant="body1"
              sx={{ fontWeight: 700, wordBreak: 'break-all', color: theme.palette.primary.main }}
            >
              {selectedNode.name}
            </Typography>

            <Divider />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Namespace</Typography>
                <Chip size="small" label={selectedNode.namespace || 'Cluster-Scoped'} />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Chip
                  size="small"
                  label={selectedNode.status}
                  sx={{
                    fontWeight: 700,
                    bgcolor: alpha(getStatusColor(selectedNode.status), 0.15),
                    color: getStatusColor(selectedNode.status),
                  }}
                />
              </Box>

              {selectedNode.ip && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">IP Address</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {selectedNode.ip}
                  </Typography>
                </Box>
              )}

              {selectedNode.nodeName && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Node</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {selectedNode.nodeName}
                  </Typography>
                </Box>
              )}

              {selectedNode.image && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Container Image</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      p: 0.8,
                      borderRadius: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    {selectedNode.image}
                  </Typography>
                </Box>
              )}

              {selectedNode.collapsedPods && selectedNode.collapsedPods.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Replica Pods ({selectedNode.collapsedPods.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                    {selectedNode.collapsedPods.map((cp) => (
                      <Paper
                        key={cp.id}
                        variant="outlined"
                        sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cp.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={cp.status}
                          sx={{
                            fontSize: '0.62rem',
                            height: 18,
                            bgcolor: alpha(getStatusColor(cp.status), 0.15),
                            color: getStatusColor(cp.status),
                          }}
                        />
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Quick Action Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(selectedNode.kind === 'Pod' || ['Deployment', 'DaemonSet', 'StatefulSet'].includes(selectedNode.kind)) && onOpenLogs && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ArticleIcon />}
                  onClick={() => onOpenLogs(selectedNode, selectedNode.kind.toLowerCase() + 's')}
                  fullWidth
                >
                  View Logs
                </Button>
              )}

              {selectedNode.kind === 'Pod' && onOpenExec && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<TerminalIcon />}
                  onClick={() => onOpenExec(selectedNode)}
                  fullWidth
                >
                  Open Shell (Exec)
                </Button>
              )}

              {onViewYaml && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ArticleIcon />}
                  onClick={() => onViewYaml(selectedNode)}
                  fullWidth
                >
                  View / Edit YAML
                </Button>
              )}

              {['Deployment', 'StatefulSet'].includes(selectedNode.kind) && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {onScale && (
                    <Button variant="outlined" size="small" onClick={() => onScale(selectedNode)} fullWidth>
                      Scale
                    </Button>
                  )}
                  {onRestart && (
                    <Button variant="outlined" color="warning" size="small" onClick={() => onRestart(selectedNode)} fullWidth>
                      Restart
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
