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
  ToggleButton,
  ToggleButtonGroup,
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
import ViewColumnRoundedIcon from '@mui/icons-material/ViewColumnRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import LayersClearRoundedIcon from '@mui/icons-material/LayersClearRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import { useClusterTopology } from '../api/dashboard.api';
import { TopologyNode, TopologyEdge, TopologyKind } from '../types/dashboard.types';

export type TopologyLayoutMode = 'tiered' | 'namespace-grid' | 'compact-tree';

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

interface NamespaceGroup {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
  status: string;
}

const NODE_WIDTH = 224;
const NODE_HEIGHT = 76;
const NODE_SPACING_Y = 92;

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

  // Layout & Visibility Organization Modes
  const [layoutMode, setLayoutMode] = useState<TopologyLayoutMode>('tiered');
  const [groupReplicas, setGroupReplicas] = useState<boolean>(true);
  const [hidePods, setHidePods] = useState<boolean>(false);
  const [showIssuesOnly, setShowIssuesOnly] = useState<boolean>(false);

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
    const newK = Math.min(Math.max(transform.k * zoomFactor, 0.22), 2.5);

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
    setTransform((prev) => ({ ...prev, k: Math.max(prev.k / 1.2, 0.22) }));
  };

  const handleResetZoom = () => {
    setTransform({ x: 80, y: 60, k: 1 });
  };

  const toggleKind = (kind: TopologyKind) => {
    setVisibleKinds((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  // Top issues count calculation
  const issueCounts = useMemo(() => {
    if (!topologyData) return 0;
    return topologyData.nodes.filter(
      (n) => n.status === 'Warning' || n.status === 'Error' || n.status === 'CrashLoop' || n.status === 'Pending'
    ).length;
  }, [topologyData]);

  // Compute Layout Positions (with support for Tiered Multi-Column, Namespace Grid, and Compact Tree)
  const { layoutNodes, layoutEdges, namespaceGroups, bounds } = useMemo(() => {
    if (!topologyData || !topologyData.nodes.length) {
      return {
        layoutNodes: [],
        layoutEdges: [],
        namespaceGroups: [],
        bounds: { minX: 0, maxX: 1000, minY: 0, maxY: 600 },
      };
    }

    // 1. Initial filter by kind and pod visibility
    const filteredNodes = topologyData.nodes.filter((n) => visibleKinds[n.kind]);
    const rawEdges = topologyData.edges;

    // Map pod owners
    const podOwnerMap = new Map<string, string>();
    const workloadToPods = new Map<string, TopologyNode[]>();
    rawEdges.forEach((e) => {
      if (e.relation === 'manages') {
        podOwnerMap.set(e.target, e.source);
      }
    });

    topologyData.nodes.forEach((node) => {
      if (node.kind === 'Pod') {
        const ownerId = podOwnerMap.get(node.id);
        if (ownerId) {
          const list = workloadToPods.get(ownerId) || [];
          list.push(node);
          workloadToPods.set(ownerId, list);
        }
      }
    });

    let processedNodes: LayoutNode[] = [];
    const nodeLookup = new Map<string, LayoutNode>();

    if (hidePods) {
      // In Controller-Only mode, omit Pod nodes and enrich workload detail with replica badges
      filteredNodes
        .filter((n) => n.kind !== 'Pod')
        .forEach((node) => {
          const pods = workloadToPods.get(node.id) || [];
          let detail = node.detail;
          if (pods.length > 0) {
            const healthyCount = pods.filter((p) => p.status === 'Healthy' || p.status === 'Running').length;
            detail = `${healthyCount}/${pods.length} Pods Ready`;
          }
          const ln: LayoutNode = {
            ...node,
            detail,
            collapsedPods: pods,
            x: 0,
            y: 0,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          };
          processedNodes.push(ln);
          nodeLookup.set(ln.id, ln);
        });
    } else if (groupReplicas) {
      // Group Pod replicas into a single card per workload controller
      const standalonePods: TopologyNode[] = [];

      filteredNodes.forEach((node) => {
        if (node.kind === 'Pod') {
          const ownerId = podOwnerMap.get(node.id);
          if (!ownerId) {
            standalonePods.push(node);
          }
        } else {
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
        if (!visibleKinds['Pod']) return;
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
          const hasError = pods.some((p) => p.status === 'Error' || p.status === 'CrashLoop');
          const hasWarning = pods.some((p) => p.status === 'Warning' || p.status === 'Pending');
          const status = hasError ? 'Error' : hasWarning ? 'Warning' : 'Healthy';
          const aggregatedId = `group:${workloadId}:pods`;

          const ln: LayoutNode = {
            id: aggregatedId,
            kind: 'Pod',
            name: `${first.name.replace(/-[a-z0-9]+-[a-z0-9]+$/, '')} (${pods.length} Replicas)`,
            namespace: first.namespace,
            status,
            detail: `${pods.filter((p) => p.status === 'Healthy' || p.status === 'Running').length}/${pods.length} Ready`,
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
      // Individual pods mode
      processedNodes = filteredNodes.map((n) => {
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

    // 2. Filter for "Issues Only" mode if requested
    if (showIssuesOnly) {
      const issueNodeIds = new Set<string>();
      processedNodes.forEach((n) => {
        if (n.status === 'Warning' || n.status === 'Error' || n.status === 'CrashLoop' || n.status === 'Pending') {
          issueNodeIds.add(n.id);
        }
      });

      // Include 1-hop connected neighbors for contextual cause & effect
      const directConnectedIds = new Set<string>(issueNodeIds);
      rawEdges.forEach((e) => {
        const src = nodeLookup.get(e.source)?.id;
        const tgt = nodeLookup.get(e.target)?.id;
        if (src && tgt) {
          if (issueNodeIds.has(src)) directConnectedIds.add(tgt);
          if (issueNodeIds.has(tgt)) directConnectedIds.add(src);
        }
      });

      processedNodes = processedNodes.filter((n) => directConnectedIds.has(n.id));
    }

    // Prepare edges between the current processed nodes
    const processedEdges: (TopologyEdge & { sourceNode: LayoutNode; targetNode: LayoutNode })[] = [];
    const edgeKeySet = new Set<string>();

    rawEdges.forEach((e) => {
      const srcNode = nodeLookup.get(e.source);
      const tgtNode = nodeLookup.get(e.target);
      if (srcNode && tgtNode && srcNode.id !== tgtNode.id) {
        // Skip edges to hidden pods
        if (hidePods && (srcNode.kind === 'Pod' || tgtNode.kind === 'Pod')) return;
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

    const groups: NamespaceGroup[] = [];

    // 3. EXECUTE POSITIONING BASED ON SELECTED LAYOUT MODE
    if (layoutMode === 'namespace-grid') {
      // === LAYOUT MODE: NAMESPACE CLUSTERS (BENTO BOX) ===
      // Group nodes by namespace
      const nsMap = new Map<string, LayoutNode[]>();
      processedNodes.forEach((node) => {
        const ns = node.namespace || 'cluster-scoped';
        const list = nsMap.get(ns) || [];
        list.push(node);
        nsMap.set(ns, list);
      });

      const nsList = Array.from(nsMap.entries()).sort((a, b) => b[1].length - a[1].length);
      const COLS = nsList.length > 3 ? 3 : nsList.length > 1 ? 2 : 1;
      let colX = 60;
      let rowY = 60;
      let maxRowHeight = 0;
      let colIndex = 0;

      nsList.forEach(([nsName, nodes]) => {
        // Layout nodes internally within this namespace box in mini-tiers
        const internalTiers: LayoutNode[][] = [[], [], [], [], []];
        nodes.forEach((n) => {
          const t = Math.min(Math.max(n.tier, 0), 4);
          internalTiers[t].push(n);
        });

        // Calculate mini-tier dimensions
        let innerX = colX + 24;
        let innerMaxHeight = 0;

        internalTiers.forEach((tierNodes) => {
          if (tierNodes.length === 0) return;
          const tierCols = Math.max(1, Math.ceil(tierNodes.length / 5));
          const tierHeight = Math.min(tierNodes.length, 5) * (NODE_HEIGHT + 18);
          innerMaxHeight = Math.max(innerMaxHeight, tierHeight);

          tierNodes.forEach((node, idx) => {
            const c = Math.floor(idx / 5);
            const r = idx % 5;
            node.x = innerX + c * (NODE_WIDTH + 16);
            node.y = rowY + 54 + r * (NODE_HEIGHT + 18);
          });

          innerX += tierCols * (NODE_WIDTH + 16) + 32;
        });

        const clusterWidth = Math.max(380, innerX - colX + 16);
        const clusterHeight = Math.max(220, innerMaxHeight + 76);

        // Determine group status
        const hasError = nodes.some((n) => n.status === 'Error' || n.status === 'CrashLoop');
        const hasWarning = nodes.some((n) => n.status === 'Warning' || n.status === 'Pending');
        const groupStatus = hasError ? 'Error' : hasWarning ? 'Warning' : 'Healthy';

        groups.push({
          name: nsName,
          x: colX,
          y: rowY,
          width: clusterWidth,
          height: clusterHeight,
          count: nodes.length,
          status: groupStatus,
        });

        maxRowHeight = Math.max(maxRowHeight, clusterHeight);
        colIndex++;

        if (colIndex >= COLS) {
          colIndex = 0;
          colX = 60;
          rowY += maxRowHeight + 50;
          maxRowHeight = 0;
        } else {
          colX += clusterWidth + 50;
        }
      });
    } else if (layoutMode === 'compact-tree') {
      // === LAYOUT MODE: COMPACT PIPELINE FOREST ===
      // Group into connected pipeline trees starting from Ingresses/Services
      const visited = new Set<string>();
      const pipelines: LayoutNode[][] = [];

      // Find root edge nodes (Ingresses, Gateways, or Services without incoming managed links)
      const rootCandidates = processedNodes.filter(
        (n) => n.kind === 'Ingress' || n.kind === 'Gateway' || (n.kind === 'Service' && n.tier <= 1)
      );

      rootCandidates.forEach((root) => {
        if (visited.has(root.id)) return;
        const pipeline: LayoutNode[] = [];
        const queue: LayoutNode[] = [root];
        visited.add(root.id);

        while (queue.length > 0) {
          const current = queue.shift()!;
          pipeline.push(current);

          processedEdges.forEach((edge) => {
            if (edge.sourceNode.id === current.id && !visited.has(edge.targetNode.id)) {
              visited.add(edge.targetNode.id);
              queue.push(edge.targetNode);
            }
          });
        }
        pipelines.push(pipeline);
      });

      // Remaining standalone nodes (Nodes, Storage, or isolated workloads)
      const orphanNodes = processedNodes.filter((n) => !visited.has(n.id));

      let currentPipelineY = 60;
      pipelines.forEach((pipeline) => {
        // Sort pipeline by tier
        pipeline.sort((a, b) => a.tier - b.tier);
        const pipelineTiers: LayoutNode[][] = [[], [], [], [], []];
        pipeline.forEach((n) => {
          const t = Math.min(Math.max(n.tier, 0), 4);
          pipelineTiers[t].push(n);
        });

        let pMaxHeight = NODE_HEIGHT;
        let pCurrentX = 60;

        pipelineTiers.forEach((tierNodes) => {
          if (tierNodes.length === 0) return;
          const tierHeight = tierNodes.length * (NODE_HEIGHT + 16);
          pMaxHeight = Math.max(pMaxHeight, tierHeight);

          tierNodes.forEach((node, idx) => {
            node.x = pCurrentX;
            node.y = currentPipelineY + idx * (NODE_HEIGHT + 16);
          });

          pCurrentX += NODE_WIDTH + 70;
        });

        currentPipelineY += pMaxHeight + 48;
      });

      // Place orphan nodes at bottom shelf
      if (orphanNodes.length > 0) {
        const orphanX = 60;
        const orphanY = currentPipelineY + 20;
        orphanNodes.forEach((node, idx) => {
          const c = idx % 5;
          const r = Math.floor(idx / 5);
          node.x = orphanX + c * (NODE_WIDTH + 24);
          node.y = orphanY + r * (NODE_HEIGHT + 18);
        });
      }
    } else {
      // === LAYOUT MODE: TIERED FLOW WITH SMART MULTI-COLUMN WRAPPING ===
      // Group into 5 tiers
      const tiers: LayoutNode[][] = [[], [], [], [], []];
      processedNodes.forEach((n) => {
        const t = Math.min(Math.max(n.tier, 0), 4);
        tiers[t].push(n);
      });

      const MAX_PER_COL = 6;
      let currentTierX = 60;

      // Find overall max tier height to center rows
      let maxTierVisualHeight = 0;
      tiers.forEach((tierNodes) => {
        const rows = Math.min(tierNodes.length, MAX_PER_COL);
        maxTierVisualHeight = Math.max(maxTierVisualHeight, rows * NODE_SPACING_Y);
      });

      tiers.forEach((tierNodes) => {
        if (tierNodes.length === 0) {
          currentTierX += 80;
          return;
        }

        const cols = Math.max(1, Math.ceil(tierNodes.length / MAX_PER_COL));
        const rows = Math.min(tierNodes.length, MAX_PER_COL);
        const thisTierHeight = rows * NODE_SPACING_Y;
        const startY = Math.max(60, (maxTierVisualHeight - thisTierHeight) / 2 + 60);

        tierNodes.forEach((node, nodeIdx) => {
          const colIndex = Math.floor(nodeIdx / MAX_PER_COL);
          const rowIndex = nodeIdx % MAX_PER_COL;

          node.x = currentTierX + colIndex * (NODE_WIDTH + 24);
          node.y = startY + rowIndex * NODE_SPACING_Y;
        });

        currentTierX += cols * (NODE_WIDTH + 24) + 64;
      });
    }

    // Calculate canvas bounding rectangle
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

    groups.forEach((g) => {
      minX = Math.min(minX, g.x);
      maxX = Math.max(maxX, g.x + g.width);
      minY = Math.min(minY, g.y);
      maxY = Math.max(maxY, g.y + g.height);
    });

    if (minX === Infinity) {
      minX = 0;
      maxX = 1200;
      minY = 0;
      maxY = 700;
    }

    return {
      layoutNodes: processedNodes,
      layoutEdges: processedEdges,
      namespaceGroups: groups,
      bounds: { minX, maxX: maxX + 120, minY, maxY: maxY + 120 },
    };
  }, [topologyData, visibleKinds, groupReplicas, hidePods, showIssuesOnly, layoutMode]);

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
    const k = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.15);

    const x = (width - graphWidth * k) / 2 - bounds.minX * k;
    const y = (height - graphHeight * k) / 2 - bounds.minY * k;

    setTransform({ x, y, k });
  }, [bounds]);

  useEffect(() => {
    if (layoutNodes.length > 0) {
      const timer = setTimeout(() => {
        handleFitView();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [layoutNodes.length, selectedNamespace, layoutMode, hidePods, showIssuesOnly, handleFitView]);

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
        height: isFullscreen ? '100vh' : 'calc(100vh - 145px)',
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
          p: 1.2,
          px: 2,
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HubIcon sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: -0.2 }}>
              Topology Graph
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              displayEmpty
              sx={{
                height: 32,
                fontSize: '0.78rem',
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

          {/* Layout Mode Selector (Tiered Flow / Namespace Grid / Compact Tree) */}
          <ToggleButtonGroup
            value={layoutMode}
            exclusive
            onChange={(_, val) => val && setLayoutMode(val)}
            size="small"
            sx={{
              height: 32,
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              '& .MuiToggleButton-root': {
                px: 1.2,
                py: 0.4,
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: 650,
                gap: 0.6,
              },
            }}
          >
            <ToggleButton value="tiered">
              <Tooltip title="Tiered Architectural Flow (Smart Multi-Column)">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ViewColumnRoundedIcon sx={{ fontSize: 16 }} />
                  <span>Tiered</span>
                </Box>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="namespace-grid">
              <Tooltip title="Namespace Clusters (Grouped Bento Boxes)">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <GridViewRoundedIcon sx={{ fontSize: 16 }} />
                  <span>Namespace Grid</span>
                </Box>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="compact-tree">
              <Tooltip title="Compact Pipeline Tree (Linear Ingress to Workload)">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccountTreeRoundedIcon sx={{ fontSize: 16 }} />
                  <span>Pipelines</span>
                </Box>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Center: Scalability Controls (Hide Pods, Issues Only, Search) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          {/* Controllers-Only / Hide Pods Toggle */}
          <Tooltip title="Reduce visual noise by hiding individual pod boxes. Replicas and health are shown directly on controllers.">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={hidePods}
                  onChange={(e) => setHidePods(e.target.checked)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LayersClearRoundedIcon sx={{ fontSize: 15, color: hidePods ? 'primary.main' : 'text.secondary' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: hidePods ? 'primary.main' : 'text.secondary' }}>
                    Controllers Only
                  </Typography>
                </Box>
              }
              sx={{ m: 0 }}
            />
          </Tooltip>

          {/* Group Replicas Toggle (enabled when pods are visible) */}
          {!hidePods && (
            <Tooltip title="Combine identical pod replicas belonging to the same controller into a single node">
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={groupReplicas}
                    onChange={(e) => setGroupReplicas(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ fontWeight: 650, fontSize: '0.72rem', color: 'text.secondary' }}>
                    Group Pods
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            </Tooltip>
          )}

          {/* Issues Only Filter Button */}
          <Button
            size="small"
            variant={showIssuesOnly ? 'contained' : 'outlined'}
            color={showIssuesOnly ? 'warning' : 'inherit'}
            onClick={() => setShowIssuesOnly(!showIssuesOnly)}
            startIcon={<WarningAmberRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{
              height: 30,
              fontSize: '0.73rem',
              fontWeight: 750,
              borderRadius: 1.5,
              textTransform: 'none',
              borderColor: showIssuesOnly ? undefined : theme.palette.divider,
            }}
          >
            Issues Only
            {issueCounts > 0 && (
              <Chip
                label={issueCounts}
                size="small"
                color={showIssuesOnly ? 'default' : 'warning'}
                sx={{ ml: 0.8, height: 16, fontSize: '0.62rem', fontWeight: 800 }}
              />
            )}
          </Button>

          {/* Search Box */}
          <TextField
            size="small"
            placeholder="Search resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiInputBase-root': { height: 32, fontSize: '0.78rem', borderRadius: 1.5, width: 170 },
            }}
          />
        </Box>

        {/* Right: Summary Chip & Canvas Zoom Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Chip
            size="small"
            label={`${layoutNodes.length} Nodes · ${layoutEdges.length} Links`}
            sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(59, 130, 246, 0.08)',
              color: theme.palette.primary.main,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          />

          <Divider orientation="vertical" flexItem sx={{ height: 18, my: 'auto' }} />

          <Tooltip title="Zoom In (+)">
            <IconButton size="small" onClick={handleZoomIn} sx={{ border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 }}>
              <ZoomInIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out (-)">
            <IconButton size="small" onClick={handleZoomOut} sx={{ border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 }}>
              <ZoomOutIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fit View to Screen">
            <IconButton size="small" onClick={handleFitView} sx={{ border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 }}>
              <FitScreenIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Zoom (100%)">
            <IconButton size="small" onClick={handleResetZoom} sx={{ border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 }}>
              <RestartAltIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ height: 18, my: 'auto' }} />

          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}>
            <IconButton
              size="small"
              onClick={() => setIsFullscreen(!isFullscreen)}
              sx={{ border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 }}
            >
              {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: 16 }} /> : <FullscreenIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* FILTER CHIPS ROW */}
      <Box
        sx={{
          px: 2,
          py: 0.6,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: 0.8,
          overflowX: 'auto',
          zIndex: 9,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mr: 0.5 }}>
          <FilterAltRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.62rem' }}>
            Layers:
          </Typography>
        </Box>

        {(['Ingress', 'Service', 'Deployment', 'DaemonSet', 'StatefulSet', 'Pod', 'Node', 'PVC'] as TopologyKind[]).map((kind) => {
          if (hidePods && kind === 'Pod') return null;
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
                height: 22,
                fontSize: '0.68rem',
                fontWeight: 650,
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
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981' }} />
            <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>Healthy</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#f59e0b' }} />
            <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>Degraded</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#ef4444' }} />
            <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>Error</Typography>
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
              No matching resources found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, textAlign: 'center' }}>
              {showIssuesOnly
                ? 'All resources in this scope are running healthy! Turn off "Issues Only" to see all cluster workloads.'
                : `No resources found in namespace "${selectedNamespace}".`}
            </Typography>
            {showIssuesOnly ? (
              <Button variant="outlined" size="small" onClick={() => setShowIssuesOnly(false)}>
                Show All Workloads
              </Button>
            ) : (
              <Button variant="outlined" size="small" onClick={() => setSelectedNamespace('all')}>
                View All Namespaces
              </Button>
            )}
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
          {/* SVG Canvas for Namespace Clusters & Links */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: bounds.maxX + 600,
              height: bounds.maxY + 600,
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

            {/* Namespace Cluster Bento Box Cards (Rendered in namespace-grid mode) */}
            {layoutMode === 'namespace-grid' &&
              namespaceGroups.map((g) => (
                <g key={g.name}>
                  {/* Outer cluster container box */}
                  <rect
                    x={g.x}
                    y={g.y}
                    width={g.width}
                    height={g.height}
                    rx={14}
                    fill={isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(241, 245, 249, 0.75)'}
                    stroke={
                      g.status === 'Error'
                        ? 'rgba(239, 68, 68, 0.5)'
                        : g.status === 'Warning'
                        ? 'rgba(245, 158, 11, 0.5)'
                        : isDark
                        ? 'rgba(71, 85, 105, 0.35)'
                        : 'rgba(203, 213, 225, 0.7)'
                    }
                    strokeWidth={1.6}
                    strokeDasharray={g.status !== 'Healthy' ? '4,4' : undefined}
                  />

                  {/* Header strip */}
                  <rect
                    x={g.x}
                    y={g.y}
                    width={g.width}
                    height={36}
                    rx={14}
                    fill={isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.85)'}
                  />

                  {/* Status dot */}
                  <circle
                    cx={g.x + 18}
                    cy={g.y + 18}
                    r={5}
                    fill={getStatusColor(g.status)}
                  />

                  {/* Namespace title */}
                  <text
                    x={g.x + 32}
                    y={g.y + 22}
                    fill={isDark ? '#f1f5f9' : '#0f172a'}
                    fontSize={12.5}
                    fontWeight={750}
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    Namespace: {g.name}
                  </text>

                  {/* Resource count badge text */}
                  <text
                    x={g.x + g.width - 16}
                    y={g.y + 22}
                    textAnchor="end"
                    fill={isDark ? '#94a3b8' : '#64748b'}
                    fontSize={11}
                    fontWeight={650}
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {g.count} resources
                  </text>
                </g>
              ))}

            {/* Connecting Bezier Edges */}
            {layoutEdges.map((edge) => {
              const src = edge.sourceNode;
              const tgt = edge.targetNode;

              const x1 = src.x + src.width;
              const y1 = src.y + src.height / 2;
              const x2 = tgt.x;
              const y2 = tgt.y + tgt.height / 2;

              const dx = Math.max(Math.abs(x2 - x1) * 0.45, 36);
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
                    strokeWidth={isHighlighted && (hoveredNodeId || selectedNodeId) ? 2.6 : 1.6}
                    strokeDasharray={isError ? '5,5' : undefined}
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
                    p: 1.1,
                    boxSizing: 'border-box',
                    borderRadius: 2,
                    bgcolor: isDark
                      ? isSelected
                        ? 'rgba(30, 41, 59, 0.98)'
                        : 'rgba(15, 23, 42, 0.92)'
                      : isSelected
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.94)',
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, minWidth: 0 }}>
                      {getKindIcon(node.kind)}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 750,
                          fontSize: '0.64rem',
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
                        fontSize: '0.8rem',
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.67rem',
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 125,
                        fontWeight: 600,
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
                          fontSize: '0.6rem',
                          fontWeight: 650,
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
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.88)',
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
                rx={3}
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, maxHeight: 220, overflowY: 'auto' }}>
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
