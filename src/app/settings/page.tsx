'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColorMode } from '@/shared/theme/theme-registry';
import { useCurrentUser, logout } from '@/shared/hooks/use-auth';

interface UserRecord {
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  displayName?: string;
  createdAt?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mode, setColorMode } = useColorMode();
  const { data: currentUser } = useCurrentUser();

  // Active section index: 0 = Theme, 1 = User Management
  const [activeSection, setActiveSection] = useState<number>(0);

  // Global action notification
  const [actionAlert, setActionAlert] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  // Fetch Users List
  const { data: usersData, refetch: refetchUsers, isLoading: usersLoading } = useQuery<{ users: UserRecord[] }>({
    queryKey: ['usersList'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const usersList = usersData?.users || [];
  const isAdmin = currentUser?.role === 'admin';

  // 3-Dot Menu State
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, user: UserRecord) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  // --- CREATE USER DIALOG STATE ---
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserConfirmPass, setNewUserConfirmPass] = useState('');
  const [showNewUserPass, setShowNewUserPass] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  const handleOpenCreateDialog = () => {
    setNewUsername('');
    setNewDisplayName('');
    setNewRole('operator');
    setNewUserPass('');
    setNewUserConfirmPass('');
    setShowNewUserPass(false);
    setCreateUserError(null);
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    if (!createUserLoading) {
      setCreateDialogOpen(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);

    const trimmedUser = newUsername.trim();
    if (!trimmedUser || trimmedUser.length < 3) {
      setCreateUserError('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedUser)) {
      setCreateUserError('Username may only contain letters, numbers, dots, hyphens, or underscores.');
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
          displayName: newDisplayName.trim() || trimmedUser,
          role: newRole,
          password: newUserPass,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateUserError(data.error || 'Failed to create user.');
      } else {
        setActionAlert({ severity: 'success', message: `User "${trimmedUser}" created successfully.` });
        setCreateDialogOpen(false);
        refetchUsers();
      }
    } catch (err: any) {
      setCreateUserError(err.message || 'Error creating user.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  // --- UPDATE CREDENTIALS DIALOG STATE ---
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateTargetUser, setUpdateTargetUser] = useState<UserRecord | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPass, setEditConfirmPass] = useState('');
  const [showEditPass, setShowEditPass] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleOpenUpdateDialog = () => {
    if (!selectedUser) return;
    setUpdateTargetUser(selectedUser);
    setEditDisplayName(selectedUser.displayName || selectedUser.username);
    setEditRole(selectedUser.role);
    setEditPassword('');
    setEditConfirmPass('');
    setShowEditPass(false);
    setUpdateError(null);
    setUpdateDialogOpen(true);
    handleCloseMenu();
  };

  const handleCloseUpdateDialog = () => {
    if (!updateLoading) {
      setUpdateDialogOpen(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTargetUser) return;
    setUpdateError(null);

    if (editPassword) {
      if (editPassword.length < 6) {
        setUpdateError('New password must be at least 6 characters.');
        return;
      }
      if (editPassword !== editConfirmPass) {
        setUpdateError('New passwords do not match.');
        return;
      }
    }

    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(updateTargetUser.username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editDisplayName.trim() || updateTargetUser.username,
          role: editRole,
          password: editPassword.trim() ? editPassword : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUpdateError(data.error || 'Failed to update credentials.');
      } else {
        setActionAlert({
          severity: 'success',
          message: `Credentials updated successfully for user "${updateTargetUser.username}".`,
        });
        setUpdateDialogOpen(false);
        refetchUsers();
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Error updating credentials.');
    } finally {
      setUpdateLoading(false);
    }
  };

  // --- DELETE USER DIALOG STATE ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleOpenDeleteDialog = () => {
    if (!selectedUser) return;
    setDeleteTargetUser(selectedUser);
    setDeleteError(null);
    setDeleteDialogOpen(true);
    handleCloseMenu();
  };

  const handleCloseDeleteDialog = () => {
    if (!deleteLoading) {
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetUser) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(deleteTargetUser.username)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete user.');
      } else {
        setActionAlert({ severity: 'success', message: `User "${deleteTargetUser.username}" deleted.` });
        setDeleteDialogOpen(false);
        refetchUsers();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting user.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const navItems = [
    {
      id: 0,
      title: 'Appearance & Theme',
      subtitle: 'Light and Dark modes',
      icon: <PaletteIcon sx={{ fontSize: 20 }} />,
    },
    {
      id: 1,
      title: 'User Management',
      subtitle: 'Accounts, credentials & roles',
      icon: <PeopleIcon sx={{ fontSize: 20 }} />,
      badge: `${usersList.length}`,
    },
  ];

  return (
    <Box sx={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* Top Header Bar */}
      <Box
        component="header"
        sx={{
          py: 1.25,
          px: 3,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/')}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              color: 'text.primary',
              borderColor: 'divider',
              height: 30,
              px: 1.5,
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            Dashboard
          </Button>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem', color: 'text.primary', letterSpacing: '-0.01em' }}>
            Settings
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title="Sign Out">
            <IconButton
              onClick={() => logout()}
              size="small"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 0.8,
                color: 'text.secondary',
                '&:hover': { color: 'error.main', borderColor: 'error.main' },
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Container: Left Sidebar & Right Content Panel */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar Navigation Panel */}
        <Box
          sx={{
            width: 270,
            minWidth: 270,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            p: 2,
            overflowY: 'auto',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', px: 1.5, mb: 1, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Settings
          </Typography>

          <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
            {navItems.map((item) => {
              const selected = activeSection === item.id;
              return (
                <ListItemButton
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    px: 1.5,
                    border: '1px solid',
                    borderColor: selected ? 'rgba(56, 189, 248, 0.4)' : 'transparent',
                    bgcolor: selected ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                    color: selected ? '#38bdf8' : 'text.primary',
                    '&:hover': {
                      bgcolor: selected ? 'rgba(56, 189, 248, 0.12)' : 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: selected ? '#38bdf8' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={item.subtitle}
                    slotProps={{
                      primary: {
                        sx: {
                          fontWeight: selected ? 750 : 600,
                          fontSize: '0.86rem',
                          color: selected ? (mode === 'dark' ? '#38bdf8' : '#0284c7') : 'text.primary',
                        },
                      },
                      secondary: {
                        sx: {
                          fontSize: '0.72rem',
                          color: 'text.secondary',
                        },
                      },
                    }}
                  />
                  {item.badge && (
                    <Chip
                      label={item.badge}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: selected ? 'rgba(56, 189, 248, 0.2)' : 'action.selected',
                        color: selected ? '#38bdf8' : 'text.secondary',
                      }}
                    />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        {/* Right Scrollable Content Panel */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: '100%',
            overflowY: 'auto',
            p: { xs: 2.5, sm: 4 },
          }}
        >
          <Box sx={{ maxWidth: 960, mx: 'auto' }}>
            {/* Global feedback alert */}
            {actionAlert && (
              <Alert
                severity={actionAlert.severity}
                onClose={() => setActionAlert(null)}
                sx={{ mb: 3, borderRadius: 2 }}
              >
                {actionAlert.message}
              </Alert>
            )}

            {/* SECTION 0: Appearance & Theme */}
            {activeSection === 0 && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5, letterSpacing: '-0.02em' }}>
                    Appearance & Theme
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    Customize visual dashboard mode for low-light or day operations
                  </Typography>
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                    Theme Preference
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                    {/* Dark Mode Card */}
                    <Box
                      onClick={() => setColorMode('dark')}
                      sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: mode === 'dark' ? '#38bdf8' : 'divider',
                        bgcolor: '#0f172a',
                        color: '#f8fafc',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#38bdf8', transform: 'translateY(-2px)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DarkModeIcon sx={{ color: '#38bdf8', fontSize: 22 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                            Dark Mode
                          </Typography>
                        </Box>
                        {mode === 'dark' && <CheckCircleIcon sx={{ color: '#38bdf8', fontSize: 20 }} />}
                      </Box>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.78rem', mb: 2 }}>
                        Deep obsidian dashboard aesthetic designed to reduce eye strain in 24/7 mission control rooms.
                      </Typography>
                      <Box sx={{ height: 16, borderRadius: 1, bgcolor: '#1e293b', border: '1px solid #334155' }} />
                    </Box>

                    {/* Light Mode Card */}
                    <Box
                      onClick={() => setColorMode('light')}
                      sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: mode === 'light' ? '#0284c7' : 'divider',
                        bgcolor: '#ffffff',
                        color: '#0f172a',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#0284c7', transform: 'translateY(-2px)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LightModeIcon sx={{ color: '#0284c7', fontSize: 22 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            Light Mode
                          </Typography>
                        </Box>
                        {mode === 'light' && <CheckCircleIcon sx={{ color: '#0284c7', fontSize: 20 }} />}
                      </Box>
                      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.78rem', mb: 2 }}>
                        High-contrast crisp white theme optimized for daylight readability and office monitors.
                      </Typography>
                      <Box sx={{ height: 16, borderRadius: 1, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0' }} />
                    </Box>
                  </Box>
                </Paper>
              </Box>
            )}

            {/* SECTION 1: User Management (combined with credentials and password) */}
            {activeSection === 1 && (
              <Box>
                {/* Header with Title and Create User Button */}
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5, letterSpacing: '-0.02em' }}>
                      User Management
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                      Manage user accounts, roles, access levels, and security credentials
                    </Typography>
                  </Box>

                  {isAdmin && (
                    <Button
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={handleOpenCreateDialog}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        px: 2.2,
                        py: 0.9,
                        bgcolor: '#0284c7',
                        '&:hover': { bgcolor: '#0369a1' },
                      }}
                    >
                      Create User
                    </Button>
                  )}
                </Box>

                {/* Registered Users Table Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 750, color: 'text.primary' }}>
                      Registered Users ({usersList.length})
                    </Typography>
                    {usersLoading && <CircularProgress size={16} />}
                  </Box>

                  <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem' }}>USER</TableCell>
                          <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem' }}>DISPLAY NAME</TableCell>
                          <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem' }}>ROLE</TableCell>
                          <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem' }}>CREATED</TableCell>
                          <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', textAlign: 'right' }}>ACTIONS</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {usersList.map((user) => {
                          const isSelf = user.username.toLowerCase() === currentUser?.username.toLowerCase();
                          return (
                            <TableRow key={user.username} hover>
                              <TableCell sx={{ fontWeight: 600 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                  <AccountCircleIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
                                  <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem' }}>
                                        {user.username}
                                      </Typography>
                                      {isSelf && (
                                        <Chip
                                          label="You"
                                          size="small"
                                          color="primary"
                                          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }}
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.82rem', color: 'text.primary' }}>
                                {user.displayName || '-'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={user.role}
                                  size="small"
                                  color={user.role === 'admin' ? 'error' : user.role === 'operator' ? 'primary' : 'default'}
                                  sx={{ fontWeight: 750, height: 20, fontSize: '0.68rem', textTransform: 'uppercase' }}
                                />
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Initial'}
                              </TableCell>
                              <TableCell sx={{ textAlign: 'right' }}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleOpenMenu(e, user)}
                                  sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    p: 0.5,
                                    '&:hover': { bgcolor: 'action.hover' },
                                  }}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* 3-DOT ACTION MENU */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 180,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <MenuItem onClick={handleOpenUpdateDialog} sx={{ py: 1, gap: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 24, color: 'primary.main' }}>
            <KeyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Update Credentials"
            slotProps={{
              primary: { sx: { fontSize: '0.84rem', fontWeight: 600 } },
            }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {selectedUser && (
          <MenuItem
            onClick={handleOpenDeleteDialog}
            disabled={
              !isAdmin ||
              selectedUser.username.toLowerCase() === currentUser?.username.toLowerCase()
            }
            sx={{
              py: 1,
              gap: 1.5,
              color: 'error.main',
              '&.Mui-disabled': { opacity: 0.45 },
            }}
          >
            <ListItemIcon sx={{ minWidth: 24, color: 'inherit' }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Delete Account"
              slotProps={{
                primary: { sx: { fontSize: '0.84rem', fontWeight: 600, color: 'inherit' } },
              }}
            />
          </MenuItem>
        )}
      </Menu>

      {/* CREATE NEW USER DIALOG */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 1 }}>
          Create New User Account
        </DialogTitle>
        <Box component="form" onSubmit={handleCreateUserSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <DialogContentText sx={{ fontSize: '0.84rem', mb: 1 }}>
              Configure account login username, role authorization, and initial security password.
            </DialogContentText>

            {createUserError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {createUserError}
              </Alert>
            )}

            <TextField
              label="Username"
              placeholder="e.g. devops-lead"
              size="small"
              required
              fullWidth
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              helperText="Only letters, numbers, dots, hyphens, or underscores"
            />

            <TextField
              label="Display Name"
              placeholder="e.g. Lead DevOps Engineer"
              size="small"
              fullWidth
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="dialog-role-select-label">Account Role</InputLabel>
              <Select
                labelId="dialog-role-select-label"
                value={newRole}
                label="Account Role"
                onChange={(e) => setNewRole(e.target.value as any)}
              >
                <MenuItem value="admin">Admin (Full Cluster Control)</MenuItem>
                <MenuItem value="operator">Operator (Deploy & Scale)</MenuItem>
                <MenuItem value="viewer">Viewer (Read-Only Inspection)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Initial Password"
              type={showNewUserPass ? 'text' : 'password'}
              size="small"
              required
              fullWidth
              placeholder="Minimum 6 characters"
              value={newUserPass}
              onChange={(e) => setNewUserPass(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNewUserPass(!showNewUserPass)} edge="end" size="small">
                        {showNewUserPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Confirm Initial Password"
              type={showNewUserPass ? 'text' : 'password'}
              size="small"
              required
              fullWidth
              placeholder="Re-enter password"
              value={newUserConfirmPass}
              onChange={(e) => setNewUserConfirmPass(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
            <Button
              onClick={handleCloseCreateDialog}
              disabled={createUserLoading}
              sx={{ textTransform: 'none', fontWeight: 650, borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createUserLoading}
              startIcon={createUserLoading ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
              }}
            >
              {createUserLoading ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* UPDATE USER CREDENTIALS DIALOG */}
      <Dialog
        open={updateDialogOpen}
        onClose={handleCloseUpdateDialog}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          Update Credentials: {updateTargetUser?.username}
        </DialogTitle>
        <Box component="form" onSubmit={handleUpdateSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <DialogContentText sx={{ fontSize: '0.84rem', mb: 1 }}>
              Modify account display details, role permissions, or set a new encrypted password.
            </DialogContentText>

            {updateError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {updateError}
              </Alert>
            )}

            <TextField
              label="Username"
              size="small"
              disabled
              fullWidth
              value={updateTargetUser?.username || ''}
            />

            <TextField
              label="Display Name"
              size="small"
              fullWidth
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
            />

            <FormControl size="small" fullWidth disabled={!isAdmin}>
              <InputLabel id="edit-role-select-label">Account Role</InputLabel>
              <Select
                labelId="edit-role-select-label"
                value={editRole}
                label="Account Role"
                onChange={(e) => setEditRole(e.target.value as any)}
              >
                <MenuItem value="admin">Admin (Full Cluster Control)</MenuItem>
                <MenuItem value="operator">Operator (Deploy & Scale)</MenuItem>
                <MenuItem value="viewer">Viewer (Read-Only Inspection)</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 0.5 }} />

            <Typography variant="caption" sx={{ fontWeight: 750, color: 'text.secondary', textTransform: 'uppercase' }}>
              Update Password (Optional)
            </Typography>

            <TextField
              label="New Password"
              type={showEditPass ? 'text' : 'password'}
              size="small"
              fullWidth
              placeholder="Leave blank to keep existing password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              helperText="Minimum 6 characters if changing"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowEditPass(!showEditPass)} edge="end" size="small">
                        {showEditPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {editPassword.length > 0 && (
              <TextField
                label="Confirm New Password"
                type={showEditPass ? 'text' : 'password'}
                size="small"
                required
                fullWidth
                placeholder="Re-enter new password"
                value={editConfirmPass}
                onChange={(e) => setEditConfirmPass(e.target.value)}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
            <Button
              onClick={handleCloseUpdateDialog}
              disabled={updateLoading}
              sx={{ textTransform: 'none', fontWeight: 650, borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={updateLoading}
              startIcon={updateLoading ? <CircularProgress size={16} color="inherit" /> : <KeyIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
              }}
            >
              {updateLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'error.main' }}>
          Delete User Account?
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ fontSize: '0.86rem', color: 'text.primary' }}>
            Are you sure you want to permanently delete user account <strong>{deleteTargetUser?.username}</strong>?
            This account will immediately lose access to NextKube.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={handleCloseDeleteDialog}
            disabled={deleteLoading}
            sx={{ textTransform: 'none', fontWeight: 650, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 2.2 }}
          >
            {deleteLoading ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
