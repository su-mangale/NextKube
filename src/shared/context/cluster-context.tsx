'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBackendUrl } from '../utils/config';
import { FleetInfo, AttachedClusterPayload } from '../types/fleet.types';
import { useFleets, useSaveFleet, useDeleteFleet } from '../api/fleet.api';

export type ClusterType = 'management' | 'workload';
export type ClusterManagedType = 'provisioned' | 'attached';

export interface ClusterInfo {
  id: string;
  name: string;
  type: ClusterType;
  managedType?: ClusterManagedType;
  provider: string;
  status: 'Healthy' | 'Provisioning' | 'Failed' | 'Degraded';
  version?: string;
  fleetId?: string;
  labels?: Record<string, string>;
  nodeCount?: number;
  cpuUtil?: number;
  memoryUtil?: number;
}

const DEFAULT_FLEETS: FleetInfo[] = [
  {
    id: 'fleet-prod',
    name: 'production-fleet',
    displayName: 'Production Fleet',
    description: 'Mission-critical production workloads across GCP and Nutanix AHV',
    environment: 'production',
    clusterSelector: {
      matchLabels: { tier: 'production' },
    },
    clusterIds: ['production-gcp', 'production-nutanix'],
    labels: { tier: 'production', compliance: 'pci-dss', backup: 'daily' },
    defaultPlatformApps: ['cert-manager', 'prometheus-operator'],
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'fleet-staging',
    name: 'staging-fleet',
    displayName: 'Staging & Dev Fleet',
    description: 'Pre-production staging, continuous integration, and QA clusters on AWS',
    environment: 'staging',
    clusterSelector: {
      matchLabels: { tier: 'staging' },
    },
    clusterIds: ['staging-aws'],
    labels: { tier: 'staging', env: 'staging', autoShutdown: 'weekends' },
    defaultPlatformApps: ['nginx-ingress', 'argocd'],
    createdAt: '2026-08-10T14:30:00Z',
  },
  {
    id: 'fleet-edge',
    name: 'edge-fleet',
    displayName: 'Edge & Branch Fleet',
    description: 'Distributed retail, factory, and branch office on-premise Kubernetes clusters',
    environment: 'edge',
    clusterSelector: {
      matchLabels: { tier: 'edge' },
    },
    clusterIds: [],
    labels: { footprint: 'lightweight', arch: 'arm64' },
    defaultPlatformApps: ['cert-manager'],
    createdAt: '2026-08-15T08:15:00Z',
  },
];

const fetchClusters = async (): Promise<ClusterInfo[]> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/clusters`);
  if (!res.ok) {
    throw new Error('Failed to retrieve clusters.');
  }
  return res.json();
};

export const isClusterInFleet = (cluster: ClusterInfo, fleet: FleetInfo): boolean => {
  if (fleet.clusterIds?.includes(cluster.id)) return true;
  if (cluster.fleetId === fleet.id) return true;
  if (fleet.clusterSelector?.matchLabels && Object.keys(fleet.clusterSelector.matchLabels).length > 0) {
    const matchEntries = Object.entries(fleet.clusterSelector.matchLabels);
    return matchEntries.every(([key, val]) => cluster.labels?.[key] === val);
  }
  return false;
};

interface ClusterContextType {
  // Fleet Scoping & Management
  activeFleetId: string; // 'all' represents All Fleets (Global View)
  activeFleet: FleetInfo | null;
  availableFleets: FleetInfo[];
  setActiveFleetId: (id: string) => void;
  createFleet: (payload: Omit<FleetInfo, 'id' | 'createdAt'>) => FleetInfo;
  updateFleet: (id: string, updates: Partial<FleetInfo>) => void;
  deleteFleet: (id: string) => void;

  // Cluster Scoping
  activeClusterId: string;
  activeCluster: ClusterInfo | null; // null represents 'All Clusters' (Fleet Overview)
  availableClusters: ClusterInfo[];
  allClusters: ClusterInfo[]; // Unfiltered by fleet
  clustersLoading: boolean;
  setActiveClusterId: (id: string) => void;
  attachCluster: (payload: AttachedClusterPayload) => ClusterInfo;
  disconnectCluster: (id: string) => Promise<boolean>;
}

const ClusterContext = createContext<ClusterContextType | undefined>(undefined);

const EMPTY_CLUSTERS: ClusterInfo[] = [];

export function ClusterProvider({ children }: { children: ReactNode }) {
  const [activeFleetId, setActiveFleetId] = useState<string>('all');
  const [activeClusterId, setActiveClusterId] = useState<string>('all');

  // Server fleet synchronization
  const { data: serverFleets } = useFleets();
  const saveFleetMutation = useSaveFleet();
  const deleteFleetMutation = useDeleteFleet();

  // Fleets state with localStorage persistence fallback
  const [fleets, setFleets] = useState<FleetInfo[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ykp-fleets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_FLEETS;
        }
      }
    }
    return DEFAULT_FLEETS;
  });

  // Synchronize state when server returns fleets
  useEffect(() => {
    if (serverFleets && serverFleets.length > 0) {
      setFleets(serverFleets);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ykp-fleets', JSON.stringify(serverFleets));
      }
    }
  }, [serverFleets]);

  const saveFleets = (newFleets: FleetInfo[]) => {
    setFleets(newFleets);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ykp-fleets', JSON.stringify(newFleets));
    }
  };

  const { data: serverClusters, isLoading: clustersLoading } = useQuery<ClusterInfo[]>({
    queryKey: ['clustersList'],
    queryFn: fetchClusters,
  });
  const availableClusters = serverClusters || EMPTY_CLUSTERS;
  const allMergedClusters = availableClusters;
  const filteredClusters = availableClusters;

  const activeCluster = allMergedClusters.find((c) => c.id === activeClusterId) || allMergedClusters[0] || null;
  const activeFleet = fleets.find((f) => f.id === activeFleetId) || null;

  // Fleet CRUD handlers
  const createFleet = (payload: Omit<FleetInfo, 'id' | 'createdAt'>): FleetInfo => {
    const newFleet: FleetInfo = {
      ...payload,
      id: payload.name || `fleet-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...fleets, newFleet];
    saveFleets(updated);
    saveFleetMutation.mutate({
      ...newFleet,
    });
    return newFleet;
  };

  const updateFleet = (id: string, updates: Partial<FleetInfo>) => {
    const target = fleets.find((f) => f.id === id);
    const updatedFleet = target ? { ...target, ...updates, updatedAt: new Date().toISOString() } : undefined;
    const updated = fleets.map((f) => (f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f));
    saveFleets(updated);
    if (updatedFleet) {
      saveFleetMutation.mutate({
        ...updatedFleet,
      });
    }
  };

  const deleteFleet = (id: string) => {
    const updated = fleets.filter((f) => f.id !== id);
    saveFleets(updated);
    if (activeFleetId === id) {
      setActiveFleetId('all');
    }
    deleteFleetMutation.mutate(id);
  };

  // Attach Cluster (BYOK) handler
  const attachCluster = (payload: AttachedClusterPayload): ClusterInfo => {
    const clusterId = payload.name.toLowerCase().replace(/\s+/g, '-');
    const newCluster: ClusterInfo = {
      id: clusterId,
      name: payload.name,
      type: 'workload',
      managedType: 'attached',
      provider: payload.provider,
      status: 'Healthy',
      version: payload.version || 'v1.32.0',
      fleetId: 'default',
      labels: payload.labels || {
        managedBy: 'nextkube',
        importMethod: payload.method,
      },
    };
    return newCluster;
  };

  const disconnectCluster = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/clusters/${id}`, { method: 'DELETE' });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ykp-created-clusters');
      }
      return res.ok;
    } catch (err) {
      console.error('Failed to disconnect cluster:', err);
      return false;
    }
  };

  return (
    <ClusterContext.Provider
      value={{
        // Fleet
        activeFleetId,
        activeFleet,
        availableFleets: fleets,
        setActiveFleetId,
        createFleet,
        updateFleet,
        deleteFleet,

        // Clusters
        activeClusterId,
        activeCluster,
        availableClusters: filteredClusters,
        allClusters: allMergedClusters,
        clustersLoading,
        setActiveClusterId,
        attachCluster,
        disconnectCluster,
      }}
    >
      {children}
    </ClusterContext.Provider>
  );
}

export function useCluster() {
  const context = useContext(ClusterContext);
  if (context === undefined) {
    throw new Error('useCluster must be used within a ClusterProvider');
  }
  return context;
}
