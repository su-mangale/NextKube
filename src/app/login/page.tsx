'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Chip,
  Fade,
  Tooltip,
  useTheme,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { useColorMode } from '@/shared/theme/theme-registry';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/clusters';
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { toggleColorMode } = useColorMode();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setRetryAfter(data.retryAfter || 900);
        }
        setError(data.error || 'Authentication failed. Please verify your credentials.');
        return;
      }

      // Success: redirect to target cluster view
      window.location.href = callbackUrl;
    } catch (err: any) {
      setError(err.message || 'Network error connecting to NextKube authentication service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: isDark ? '#0a0e17' : '#f8fafc',
        backgroundImage: isDark
          ? `
            radial-gradient(circle at 50% 20%, rgba(8, 145, 178, 0.15) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
            linear-gradient(180deg, #070a11 0%, #0b0f19 100%)
          `
          : `
            radial-gradient(circle at 50% 15%, rgba(14, 165, 233, 0.12) 0%, transparent 60%),
            radial-gradient(circle at 85% 85%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
            linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)
          `,
        px: 2,
        position: 'relative',
        overflow: 'hidden',
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* Top right Theme Mode Switcher */}
      <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} arrow>
          <IconButton
            onClick={toggleColorMode}
            sx={{
              p: 1.1,
              borderRadius: 2.5,
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.65)' : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(226, 232, 240, 0.9)',
              color: isDark ? '#facc15' : '#0284c7',
              boxShadow: isDark
                ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                : '0 4px 12px rgba(15, 23, 42, 0.08)',
              transition: 'all 0.25s ease',
              '&:hover': {
                transform: 'scale(1.08)',
                bgcolor: isDark ? 'rgba(30, 41, 59, 0.9)' : '#ffffff',
              },
            }}
          >
            {isDark ? <LightModeOutlinedIcon sx={{ fontSize: 20 }} /> : <DarkModeOutlinedIcon sx={{ fontSize: 20 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Decorative ambient ring glow */}
      <Box
        sx={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Fade in timeout={600}>
        <Card
          elevation={0}
          sx={{
            maxWidth: 440,
            width: '100%',
            borderRadius: 3.5,
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(24px)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px rgba(34, 211, 238, 0.1)'
              : '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 0 24px rgba(14, 165, 233, 0.06)',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
          }}
        >
          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            {/* Header / Brand */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Box
                component="img"
                src="/icon.svg"
                alt="NextKube Logo"
                sx={{
                  width: 54,
                  height: 54,
                  mb: 1.5,
                  filter: isDark
                    ? 'drop-shadow(0 0 16px rgba(34, 211, 238, 0.5))'
                    : 'drop-shadow(0 4px 12px rgba(2, 132, 199, 0.3))',
                }}
              />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  background: isDark
                    ? 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)'
                    : 'linear-gradient(135deg, #0f172a 40%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                NextKube
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  mt: 0.5,
                  textAlign: 'center',
                }}
              >
                Kubernetes Operations & Cluster Management Dashboard
              </Typography>
              <Chip
                icon={<SecurityIcon sx={{ fontSize: '0.9rem !important', color: isDark ? '#38bdf8' : '#0284c7' }} />}
                label="Secure Operator Access"
                size="small"
                sx={{
                  mt: 1.5,
                  bgcolor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.08)',
                  color: isDark ? '#38bdf8' : '#0284c7',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.2)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  height: 24,
                }}
              />
            </Box>

            {/* Error Feedback */}
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2.5,
                  bgcolor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                  color: isDark ? '#fca5a5' : '#dc2626',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
                  fontSize: '0.8rem',
                  borderRadius: 2,
                  '& .MuiAlert-icon': { color: isDark ? '#f87171' : '#ef4444' },
                }}
              >
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#475569', fontWeight: 600, mb: 0.8, display: 'block' }}>
                  Operator Username
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading || Boolean(retryAfter)}
                  autoComplete="username"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                      borderRadius: 2,
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '0.9rem',
                      '& fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1' },
                      '&:hover fieldset': { borderColor: isDark ? '#38bdf8' : '#0284c7' },
                      '&.Mui-focused fieldset': { borderColor: isDark ? '#38bdf8' : '#0284c7' },
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#475569', fontWeight: 600, mb: 0.8, display: 'block' }}>
                  Access Password
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || Boolean(retryAfter)}
                  autoComplete="current-password"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                            sx={{ color: isDark ? '#64748b' : '#94a3b8' }}
                          >
                            {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                      borderRadius: 2,
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '0.9rem',
                      '& fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1' },
                      '&:hover fieldset': { borderColor: isDark ? '#38bdf8' : '#0284c7' },
                      '&.Mui-focused fieldset': { borderColor: isDark ? '#38bdf8' : '#0284c7' },
                    },
                  }}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || Boolean(retryAfter)}
                sx={{
                  py: 1.25,
                  bgcolor: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                  '&:hover': {
                    bgcolor: '#0369a1',
                    boxShadow: '0 6px 20px rgba(2, 132, 199, 0.6)',
                  },
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: '#ffffff' }} /> : 'Sign In to Dashboard'}
              </Button>
            </Box>
          </Box>
        </Card>
      </Fade>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress size={36} color="primary" />
        </Box>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
