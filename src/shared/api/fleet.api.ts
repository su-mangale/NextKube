import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBackendUrl } from '../utils/config';
import { FleetInfo } from '../types/fleet.types';

export const fetchFleets = async (): Promise<FleetInfo[]> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/fleets`);
  if (!res.ok) {
    throw new Error('Failed to retrieve cluster fleets.');
  }
  return res.json();
};

export const saveFleet = async (
  input: Partial<FleetInfo> & { name: string; displayName: string; environment: string }
): Promise<FleetInfo> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/fleets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error('Failed to save fleet.');
  }
  return res.json();
};

export const deleteFleet = async (id: string): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/fleets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete fleet.');
  }
  return res.json();
};

export const useFleets = () => {
  return useQuery<FleetInfo[]>({
    queryKey: ['fleetsList'],
    queryFn: fetchFleets,
  });
};

export const useSaveFleet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveFleet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleetsList'] });
      queryClient.invalidateQueries({ queryKey: ['clustersList'] });
    },
  });
};

export const useDeleteFleet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFleet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleetsList'] });
      queryClient.invalidateQueries({ queryKey: ['clustersList'] });
    },
  });
};
