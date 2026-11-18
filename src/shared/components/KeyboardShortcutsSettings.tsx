'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useShortcuts, ShortcutItem } from '../utils/shortcuts';

export function KeyboardShortcutsSettings() {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const { shortcuts, updateKey, resetAll } = useShortcuts();

  const [editingItem, setEditingItem] = useState<ShortcutItem | null>(null);
  const [recordedKey, setRecordedKey] = useState<string>('');
  const [recordAlert, setRecordAlert] = useState<string | null>(null);

  // Key recorder listener for the edit modal
  useEffect(() => {
    if (!editingItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't record standalone modifier presses
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Cmd');

      let main = e.key.toUpperCase();
      if (e.code === 'Backslash' || e.key === '\\') main = '\\';
      if (e.code === 'Comma' || e.key === ',') main = ',';
      if (e.code === 'Period' || e.key === '.') main = '.';
      if (e.code === 'Slash' || e.key === '/') main = '/';
      if (e.code.startsWith('Key')) main = e.code.replace('Key', '');

      if (!parts.includes(main)) {
        parts.push(main);
      }

      if (parts.length > 0) {
        const combo = parts.join('+');
        setRecordedKey(combo);
        setRecordAlert(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [editingItem]);

  const handleOpenEdit = (item: ShortcutItem) => {
    setEditingItem(item);
    setRecordedKey(item.key);
    setRecordAlert(null);
  };

  const handleSaveEdit = () => {
    if (!editingItem || !recordedKey) return;
    updateKey(editingItem.id, recordedKey);
    setEditingItem(null);
  };

  // Group shortcuts by category
  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header card with quick actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyboardIcon sx={{ color: 'primary.main', fontSize: 24 }} />
            Keyboard Shortcuts & Quick Actions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Customize global hotkeys for the Action Dock, in-cluster KubeConsole, manifest manager, and cluster switcher.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="warning"
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={resetAll}
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 2,
          }}
        >
          Reset All to Defaults
        </Button>
      </Box>

      {/* Categories tables */}
      {categories.map((category) => {
        const catShortcuts = shortcuts.filter((s) => s.category === category);
        return (
          <Paper
            key={category}
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
              {category}
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem' }}>FUNCTION</TableCell>
                    <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem' }}>DESCRIPTION</TableCell>
                    <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem' }}>KEYBOARD SHORTCUT</TableCell>
                    <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', textAlign: 'right' }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catShortcuts.map((item) => {
                    const isCustomized = item.key !== item.defaultKey;
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.84rem' }}>
                          {item.label}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                          {item.description}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={item.key}
                              size="small"
                              sx={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                borderRadius: 1.5,
                                bgcolor: isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(2, 132, 199, 0.1)',
                                color: isDark ? '#38bdf8' : '#0284c7',
                                border: '1px solid',
                                borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.25)',
                              }}
                            />
                            {isCustomized && (
                              <Chip
                                label="Custom"
                                size="small"
                                color="info"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <Tooltip title="Customize Shortcut">
                              <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            {isCustomized && (
                              <Tooltip title={`Reset to default (${item.defaultKey})`}>
                                <IconButton size="small" onClick={() => updateKey(item.id, item.defaultKey)}>
                                  <RestartAltIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        );
      })}

      {/* Edit / Rebind Key Dialog */}
      <Dialog
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              p: 1,
              bgcolor: isDark ? '#0f172a' : '#ffffff',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', pb: 1 }}>
          Rebind Shortcut: {editingItem?.label}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Press the desired combination on your keyboard (e.g. <b>Alt+K</b>, <b>Ctrl+\</b>, <b>Shift+Alt+S</b>).
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
              borderRadius: 2,
              border: '2px dashed',
              borderColor: recordedKey ? 'primary.main' : 'divider',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              minHeight: 100,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', fontWeight: 700 }}>
              Recorded Combination
            </Typography>
            <Chip
              label={recordedKey || 'Press any key combination...'}
              size="medium"
              color={recordedKey ? 'primary' : 'default'}
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.95rem',
                fontWeight: 800,
                py: 2.2,
                px: 1,
                borderRadius: 2,
              }}
            />
          </Box>

          {recordAlert && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              {recordAlert}
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Default for this action: <code>{editingItem?.defaultKey}</code>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditingItem(null)} sx={{ textTransform: 'none', fontWeight: 650 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={!recordedKey}
            startIcon={<CheckCircleRoundedIcon />}
            sx={{ textTransform: 'none', fontWeight: 750, borderRadius: 2 }}
          >
            Save Shortcut
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
