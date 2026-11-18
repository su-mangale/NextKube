'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Card,
  CardActionArea,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  useTheme,
} from '@mui/material';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColorMode } from '@/shared/theme/theme-registry';
import { useCurrentUser } from '@/shared/hooks/use-auth';
import { DraggablePaper } from './DraggablePaper';
import { KeyboardShortcutsSettings } from './KeyboardShortcutsSettings';

export interface SettingsDialogProps {
  open: boolean;
  onClose?: () => void;
  zIndex?: number;
  onFocus?: () => void;
  embedded?: boolean;
}

interface UserRecord {
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  displayName?: string;
  createdAt?: string;
}

export function SettingsDialog({ open, onClose, zIndex, onFocus, embedded = false }: SettingsDialogProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const queryClient = useQueryClient();
  const { mode, setColorMode } = useColorMode();
  const { data: currentUser } = useCurrentUser();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [actionAlert, setActionAlert] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  // Fetch Users
  const { data: usersData, refetch: refetchUsers, isLoading: usersLoading } = useQuery<{ users: UserRecord[] }>({
    queryKey: ['usersList'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: open || embedded,
  });

  const usersList = usersData?.users || [];
  const isAdmin = currentUser?.role === 'admin';

  // --- Sub-Modals for User Management ---
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserConfirmPass, setNewUserConfirmPass] = useState('');
  const [showNewUserPass, setShowNewUserPass] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateTargetUser, setUpdateTargetUser] = useState<UserRecord | null>(null);
  const [updatePassword, setUpdatePassword] = useState('');
  const [updateRole, setUpdateRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
  const [showUpdatePass, setShowUpdatePass] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);

    const trimmedUser = newUsername.trim();
    if (!trimmedUser || trimmedUser.length < 3) {
      setCreateUserError('Username must be at least 3 characters.');
      return;
    }
    if (!newUserPass || newUserPass.length < 6) {
      setCreateUserError('Password must be at least 6 characters.');
      return;
    }
    if (newUserPass !== newUserConfirmPass) {
      setCreateUserError('Passwords do not match.');
      return;
    }

    setCreateUserLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUser,
          password: newUserPass,
          role: newRole,
          displayName: newDisplayName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateUserError(data.error || 'Failed to create user.');
      } else {
        setActionAlert({ severity: 'success', message: `User "${trimmedUser}" created.` });
        setCreateDialogOpen(false);
        refetchUsers();
      }
    } catch (err: any) {
      setCreateUserError(err.message || 'Error creating user.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTargetUser) return;
    setUpdateError(null);
    setUpdateLoading(true);

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(updateTargetUser.username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: updateRole,
          ...(updatePassword.trim() ? { password: updatePassword.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUpdateError(data.error || 'Failed to update user.');
      } else {
        setActionAlert({ severity: 'success', message: `User "${updateTargetUser.username}" updated.` });
        setUpdateDialogOpen(false);
        refetchUsers();
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Error updating user.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(deleteTargetUser.username)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setActionAlert({ severity: 'error', message: data.error || 'Failed to delete user.' });
      } else {
        setActionAlert({ severity: 'success', message: `User "${deleteTargetUser.username}" deleted.` });
        setDeleteDialogOpen(false);
        refetchUsers();
      }
    } catch (err: any) {
      setActionAlert({ severity: 'error', message: err.message || 'Error deleting user.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!open && !embedded) return null;

  const innerBody = (
    <>
      {/* Header matching Create Resource Dialog layout */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: isDark ? '#0f1422' : '#f8fafc',
          color: isDark ? '#f0f6fc' : '#0f172a',
          px: 3,
          py: 2,
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsRoundedIcon sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 24 }} />
          <Box>
            <Typography variant="h6" sx={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
              System & Workspace Settings
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? '#8b949e' : '#64748b', fontSize: '0.75rem' }}>
              Manage theme preferences, dock accessibility, user accounts, and keyboard shortcuts
            </Typography>
          </Box>
        </Box>

        {onClose && !embedded && (
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: isDark ? '#94a3b8' : '#64748b',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
              borderRadius: 1.5,
              '&:hover': {
                bgcolor: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#f87171',
              },
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

        {/* Tab Navigation */}
        <Box sx={{ bgcolor: isDark ? '#0c101c' : '#f1f5f9', px: 3, borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                minHeight: 44,
                py: 1,
                fontSize: '0.84rem',
                fontWeight: 700,
                textTransform: 'none',
                color: isDark ? '#94a3b8' : '#64748b',
                '&.Mui-selected': {
                  color: isDark ? '#38bdf8' : '#0284c7',
                },
              },
              '& .MuiTabs-indicator': {
                bgcolor: isDark ? '#38bdf8' : '#0284c7',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab icon={<PaletteRoundedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Appearance & Workspace" />
            <Tab
              icon={<PeopleAltRoundedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>User Management</span>
                  <Chip
                    label={usersList.length}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                      color: isDark ? '#cbd5e1' : '#334155',
                    }}
                  />
                </Box>
              }
            />
            <Tab
              icon={<KeyboardIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Keyboard Shortcuts"
            />
          </Tabs>
        </Box>

        {/* Main Content Area */}
        <DialogContent sx={{ p: 3, bgcolor: isDark ? '#0a0e17' : '#ffffff', minHeight: 380 }}>
          {actionAlert && (
            <Alert
              severity={actionAlert.severity}
              onClose={() => setActionAlert(null)}
              sx={{ mb: 2.5, borderRadius: 2 }}
            >
              {actionAlert.message}
            </Alert>
          )}

          {/* TAB 0: Appearance & Workspace */}
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
              {/* Section 1: Color Theme Selector */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', mb: 0.5, fontSize: '0.92rem' }}>
                  Interface Color Theme
                </Typography>
                <Typography variant="caption" sx={{ color: isDark ? '#8b949e' : '#64748b', display: 'block', mb: 1.8 }}>
                  Select your preferred visual appearance. All workspace modals and consoles will automatically inherit this theme.
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  {/* Light Theme Card */}
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      border: '2px solid',
                      borderColor: mode === 'light' ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                      bgcolor: mode === 'light' ? (isDark ? 'rgba(56, 189, 248, 0.08)' : '#f0f9ff') : (isDark ? '#0d1117' : '#f8fafc'),
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <CardActionArea onClick={() => setColorMode('light')} sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Box
                            sx={{
                              p: 0.8,
                              borderRadius: 1.5,
                              bgcolor: 'rgba(202, 138, 4, 0.12)',
                              color: '#ca8a04',
                            }}
                          >
                            <LightModeRoundedIcon sx={{ fontSize: 22 }} />
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            Light Mode
                          </Typography>
                        </Box>
                        {mode === 'light' && (
                          <CheckCircleRoundedIcon sx={{ color: '#0284c7', fontSize: 22 }} />
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.4 }}>
                        Crisp, clean high-contrast presentation designed for bright daylight and standard office workspaces.
                      </Typography>
                    </CardActionArea>
                  </Card>

                  {/* Dark Theme Card */}
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      border: '2px solid',
                      borderColor: mode === 'dark' ? '#38bdf8' : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                      bgcolor: mode === 'dark' ? (isDark ? 'rgba(56, 189, 248, 0.08)' : '#0f172a') : (isDark ? '#0d1117' : '#f8fafc'),
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <CardActionArea onClick={() => setColorMode('dark')} sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Box
                            sx={{
                              p: 0.8,
                              borderRadius: 1.5,
                              bgcolor: 'rgba(56, 189, 248, 0.12)',
                              color: '#38bdf8',
                            }}
                          >
                            <DarkModeRoundedIcon sx={{ fontSize: 22 }} />
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#ffffff' }}>
                            Dark Mode
                          </Typography>
                        </Box>
                        {mode === 'dark' && (
                          <CheckCircleRoundedIcon sx={{ color: '#38bdf8', fontSize: 22 }} />
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#cbd5e1', fontSize: '0.8rem', lineHeight: 1.4 }}>
                        Deep slate aesthetic engineered for low-light environments, reduced glare, and terminal workflows.
                      </Typography>
                    </CardActionArea>
                  </Card>
                </Box>
              </Box>
            </Box>
          )}

          {/* TAB 1: User Management */}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Header with Add Button */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    Cluster Accounts & Roles
                  </Typography>
                  <Typography variant="caption" sx={{ color: isDark ? '#8b949e' : '#64748b' }}>
                    Signed in as <b>{currentUser?.username || 'Guest'}</b> ({currentUser?.role || 'operator'})
                  </Typography>
                </Box>

                {isAdmin && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PersonAddRoundedIcon />}
                    onClick={() => {
                      setNewUsername('');
                      setNewDisplayName('');
                      setNewRole('operator');
                      setNewUserPass('');
                      setNewUserConfirmPass('');
                      setShowNewUserPass(false);
                      setCreateUserError(null);
                      setCreateDialogOpen(true);
                    }}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 2,
                    }}
                  >
                    Add User
                  </Button>
                )}
              </Box>

              {/* Users Table */}
              <TableContainer
                sx={{
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
                  borderRadius: 2,
                }}
              >
                <Table size="small">
                  <TableHead sx={{ bgcolor: isDark ? '#0f1422' : '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.78rem' }}>Username</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.78rem' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.78rem' }}>Display Name</TableCell>
                      {isAdmin && (
                        <TableCell align="right" sx={{ fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.78rem' }}>Actions</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 4 : 3} align="center" sx={{ py: 3 }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : usersList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 4 : 3} align="center" sx={{ py: 3, color: isDark ? '#8b949e' : '#64748b' }}>
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      usersList.map((user) => (
                        <TableRow key={user.username} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 650, fontSize: '0.84rem' }}>
                            {user.username}
                            {user.username === currentUser?.username && (
                              <Chip label="You" size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.role}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                bgcolor:
                                  user.role === 'admin'
                                    ? (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(225, 29, 72, 0.1)')
                                    : (isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)'),
                                color: user.role === 'admin' ? '#ef4444' : (isDark ? '#38bdf8' : '#0284c7'),
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.82rem' }}>
                            {user.displayName || '—'}
                          </TableCell>
                          {isAdmin && (
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                <Tooltip title="Change Password / Role">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setUpdateTargetUser(user);
                                      setUpdatePassword('');
                                      setUpdateRole(user.role);
                                      setShowUpdatePass(false);
                                      setUpdateError(null);
                                      setUpdateDialogOpen(true);
                                    }}
                                    sx={{ color: isDark ? '#94a3b8' : '#64748b' }}
                                  >
                                    <KeyRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {user.username !== currentUser?.username && (
                                  <Tooltip title="Delete User">
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setDeleteTargetUser(user);
                                        setDeleteDialogOpen(true);
                                      }}
                                      sx={{ color: '#ef4444' }}
                                    >
                                      <DeleteOutlineRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ p: 1 }}>
              <KeyboardShortcutsSettings />
            </Box>
          )}
        </DialogContent>

        {/* Footer matching Create Resource Dialog layout */}
        {!embedded && (
          <DialogActions
            sx={{
              px: 3,
              py: 2,
              bgcolor: isDark ? '#0f1422' : '#f8fafc',
              borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="caption" sx={{ color: isDark ? '#8b949e' : '#64748b', fontSize: '0.75rem' }}>
              NextKube System Workspace Preferences
            </Typography>

            <Button
              onClick={onClose}
              variant="contained"
              color="primary"
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
              }}
            >
              Done
            </Button>
          </DialogActions>
        )}
    </>
  );

  return (
    <>
      {embedded ? (
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: isDark ? '#0a0e17' : '#ffffff',
            borderRadius: 3,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          {innerBody}
        </Paper>
      ) : (
        <Dialog
          open={open}
          onClose={(e, reason) => {
            if (reason === 'backdropClick') return;
            onClose?.();
          }}
          PaperComponent={DraggablePaper}
          maxWidth="md"
          fullWidth
          hideBackdrop={true}
          disableEnforceFocus={true}
          sx={{
            zIndex: zIndex || 1315,
            pointerEvents: 'none',
            '& .MuiDialog-container': {
              pointerEvents: 'none',
            },
            '& .MuiPaper-root': {
              pointerEvents: 'auto',
            },
          }}
          slotProps={{
            paper: {
              onClick: onFocus,
              onMouseDown: onFocus,
              sx: {
                bgcolor: isDark ? '#0a0e17' : '#ffffff',
                backgroundImage: 'none',
                borderRadius: 3,
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: isDark
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                  : '0 25px 50px -12px rgba(15, 23, 42, 0.16)',
              },
            },
          }}
        >
          {innerBody}
        </Dialog>
      )}

      {/* Subdialog 1: Create User */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !createUserLoading && setCreateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: isDark ? '#0a0e17' : '#ffffff',
              borderRadius: 3,
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, bgcolor: isDark ? '#0f1422' : '#f8fafc' }}>
          Create New User Account
        </DialogTitle>
        <DialogContent sx={{ pt: 2, bgcolor: isDark ? '#0a0e17' : '#ffffff' }}>
          {createUserError && (
            <Alert severity="error" sx={{ mb: 2 }}>{createUserError}</Alert>
          )}
          <Box component="form" onSubmit={handleCreateUserSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Username"
              size="small"
              fullWidth
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
            <TextField
              label="Display Name (optional)"
              size="small"
              fullWidth
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newRole}
                label="Role"
                onChange={(e) => setNewRole(e.target.value as any)}
              >
                <MenuItem value="operator">Operator (Read & Write)</MenuItem>
                <MenuItem value="admin">Administrator (Full Access)</MenuItem>
                <MenuItem value="viewer">Viewer (Read-only)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Password"
              type={showNewUserPass ? 'text' : 'password'}
              size="small"
              fullWidth
              required
              value={newUserPass}
              onChange={(e) => setNewUserPass(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowNewUserPass(!showNewUserPass)}>
                        {showNewUserPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="Confirm Password"
              type={showNewUserPass ? 'text' : 'password'}
              size="small"
              fullWidth
              required
              value={newUserConfirmPass}
              onChange={(e) => setNewUserConfirmPass(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: isDark ? '#0f1422' : '#f8fafc' }}>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={createUserLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateUserSubmit} variant="contained" disabled={createUserLoading}>
            {createUserLoading ? <CircularProgress size={18} color="inherit" /> : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subdialog 2: Update User */}
      <Dialog
        open={updateDialogOpen}
        onClose={() => !updateLoading && setUpdateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: isDark ? '#0a0e17' : '#ffffff',
              borderRadius: 3,
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, bgcolor: isDark ? '#0f1422' : '#f8fafc' }}>
          Update User: {updateTargetUser?.username}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, bgcolor: isDark ? '#0a0e17' : '#ffffff' }}>
          {updateError && (
            <Alert severity="error" sx={{ mb: 2 }}>{updateError}</Alert>
          )}
          <Box component="form" onSubmit={handleUpdateUserSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={updateRole}
                label="Role"
                onChange={(e) => setUpdateRole(e.target.value as any)}
              >
                <MenuItem value="operator">Operator (Read & Write)</MenuItem>
                <MenuItem value="admin">Administrator (Full Access)</MenuItem>
                <MenuItem value="viewer">Viewer (Read-only)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="New Password (leave empty to keep current)"
              type={showUpdatePass ? 'text' : 'password'}
              size="small"
              fullWidth
              value={updatePassword}
              onChange={(e) => setUpdatePassword(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowUpdatePass(!showUpdatePass)}>
                        {showUpdatePass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: isDark ? '#0f1422' : '#f8fafc' }}>
          <Button onClick={() => setUpdateDialogOpen(false)} disabled={updateLoading}>
            Cancel
          </Button>
          <Button onClick={handleUpdateUserSubmit} variant="contained" disabled={updateLoading}>
            {updateLoading ? <CircularProgress size={18} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subdialog 3: Delete Confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: isDark ? '#0a0e17' : '#ffffff',
              borderRadius: 3,
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, bgcolor: isDark ? '#0f1422' : '#f8fafc', color: '#ef4444' }}>
          Delete User Account
        </DialogTitle>
        <DialogContent sx={{ pt: 2, bgcolor: isDark ? '#0a0e17' : '#ffffff' }}>
          <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#475569' }}>
            Are you sure you want to permanently delete user <b>{deleteTargetUser?.username}</b>? This action cannot be reversed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: isDark ? '#0f1422' : '#f8fafc' }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error" disabled={deleteLoading}>
            {deleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
