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
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import KeyIcon from '@mui/icons-material/Key';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/clusters';

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
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
        bgcolor: '#0a0e17',
        backgroundImage: `
          radial-gradient(circle at 50% 20%, rgba(8, 145, 178, 0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
          linear-gradient(180deg, #070a11 0%, #0b0f19 100%)
        `,
        px: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative ambient ring glow */}
      <Box
        sx={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Fade in timeout={600}>
        <Card
          elevation={0}
          sx={{
            maxWidth: 440,
            width: '100%',
            borderRadius: 3,
            bgcolor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px rgba(34, 211, 238, 0.1)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 4 }}>
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
                  filter: 'drop-shadow(0 0 16px rgba(34, 211, 238, 0.5))',
                }}
              />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                NextKube
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  mt: 0.5,
                  textAlign: 'center',
                }}
              >
                Kubernetes Cluster Fleet Operations Console
              </Typography>
              <Chip
                icon={<SecurityIcon sx={{ fontSize: '0.9rem !important', color: '#38bdf8' }} />}
                label="Secure Operator Access"
                size="small"
                sx={{
                  mt: 1.5,
                  bgcolor: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
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
                  bgcolor: 'rgba(239, 68, 68, 0.15)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '0.8rem',
                  borderRadius: 2,
                  '& .MuiAlert-icon': { color: '#f87171' },
                }}
              >
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.8, display: 'block' }}>
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
                          <PersonIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: 2,
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                      '&:hover fieldset': { borderColor: '#38bdf8' },
                      '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.8, display: 'block' }}>
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
                          <LockOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                            sx={{ color: '#64748b' }}
                          >
                            {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: 2,
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                      '&:hover fieldset': { borderColor: '#38bdf8' },
                      '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
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
                  py: 1.2,
                  bgcolor: '#0891b2',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: '0 4px 14px rgba(8, 145, 178, 0.4)',
                  '&:hover': {
                    bgcolor: '#0e7490',
                    boxShadow: '0 6px 20px rgba(8, 145, 178, 0.6)',
                  },
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: '#ffffff' }} /> : 'Sign In to Console'}
              </Button>
            </Box>

            {/* Quick Demo Credentials Info Tip */}
            <Box
              sx={{
                mt: 3.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(30, 41, 59, 0.6)',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
              }}
            >
              <KeyIcon sx={{ color: '#38bdf8', fontSize: 18, flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                Default bootstrap credentials:{' '}
                <Box component="strong" sx={{ color: '#f8fafc' }}>
                  admin
                </Box>{' '}
                /{' '}
                <Box component="strong" sx={{ color: '#f8fafc' }}>
                  admin123
                </Box>
              </Typography>
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
            bgcolor: '#0a0e17',
          }}
        >
          <CircularProgress size={36} sx={{ color: '#38bdf8' }} />
        </Box>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
