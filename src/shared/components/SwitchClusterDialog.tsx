'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DnsIcon from '@mui/icons-material/Dns';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseIcon from '@mui/icons-material/Close';
import { ClusterInfo } from '../context/cluster-context';

export interface SwitchClusterDialogProps {
  open: boolean;
  onClose: () => void;
  currentClusterId: string;
  clusters: ClusterInfo[];
  onSelectCluster: (clusterId: string) => void;
  onAddCluster: () => void;
}

export function SwitchClusterDialog({
  open,
  onClose,
  currentClusterId,
  clusters,
  onSelectCluster,
  onAddCluster,
}: SwitchClusterDialogProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClusters = clusters.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.provider && c.provider.toLowerCase().includes(q))
    );
  });

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
            p: 1,
            bgcolor: isDark ? '#0f172a' : '#ffffff',
            border: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <DnsIcon sx={{ color: 'primary.main', fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Switch Kubernetes Cluster
          </Typography>
        </Box>
        <Chip
          label={`${clusters.length} available`}
          size="small"
          sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search clusters by name, ID, or provider..."
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
          sx={{ mb: 2, mt: 1 }}
        />

        <List sx={{ maxHeight: 360, overflowY: 'auto', p: 0 }}>
          {filteredClusters.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">No clusters matching &quot;{searchQuery}&quot;</Typography>
            </Box>
          ) : (
            filteredClusters.map((cluster) => {
              const isCurrent = cluster.id === currentClusterId;
              const isHealthy = cluster.status === 'Healthy';
              return (
                <ListItemButton
                  key={cluster.id}
                  onClick={() => {
                    onSelectCluster(cluster.id);
                    onClose();
                  }}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: isCurrent
                      ? 'primary.main'
                      : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                    bgcolor: isCurrent
                      ? isDark
                        ? 'rgba(56, 189, 248, 0.08)'
                        : 'rgba(2, 132, 199, 0.05)'
                      : 'transparent',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                      borderColor: 'primary.light',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: isHealthy ? '#10b981' : '#f59e0b',
                        boxShadow: isHealthy ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
                      }}
                    />
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 750, color: 'text.primary' }}>
                          {cluster.name}
                        </Typography>
                        {isCurrent && (
                          <Chip
                            label="Active"
                            size="small"
                            color="primary"
                            icon={<CheckCircleRoundedIcon sx={{ fontSize: '13px !important' }} />}
                            sx={{ height: 19, fontSize: '0.65rem', fontWeight: 750 }}
                          />
                        )}
                        <Chip
                          label={cluster.provider || 'Kubernetes'}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 650 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        ID: {cluster.id} {cluster.version ? `• Version: ${cluster.version}` : ''}
                      </Typography>
                    }
                  />

                  <Chip
                    label={cluster.status || 'Healthy'}
                    size="small"
                    color={isHealthy ? 'success' : 'warning'}
                    sx={{ fontWeight: 700, height: 20, fontSize: '0.65rem', borderRadius: 1 }}
                  />
                </ListItemButton>
              );
            })
          )}
        </List>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="info"
          size="small"
          startIcon={<CloudUploadRoundedIcon />}
          onClick={() => {
            onClose();
            onAddCluster();
          }}
          sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
        >
          Attach via Kubeconfig
        </Button>

        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
          sx={{ fontWeight: 650, textTransform: 'none' }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
