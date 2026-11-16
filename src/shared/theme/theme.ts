'use client';

import { createTheme } from '@mui/material/styles';

export const getGlassSurfaceStyle = (mode: 'light' | 'dark') => ({
  bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(16px)',
  border: '1px solid',
  borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
  boxShadow: mode === 'dark' ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)' : '0 8px 24px 0 rgba(148, 163, 184, 0.15)',
});

export const getGlassCardStyle = (mode: 'light' | 'dark') => ({
  ...getGlassSurfaceStyle(mode),
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-3px)',
    borderColor: mode === 'dark' ? 'rgba(6, 182, 212, 0.4)' : 'rgba(2, 132, 199, 0.4)',
    boxShadow: mode === 'dark' ? '0 12px 36px 0 rgba(0, 0, 0, 0.45)' : '0 12px 32px 0 rgba(148, 163, 184, 0.25)',
  },
});

export const getTheme = (mode: 'light' | 'dark') => {
  return createTheme({
    palette: {
      mode,
      ...(mode === 'dark'
        ? {
            primary: {
              main: '#06b6d4', // Neon Cyan
              light: '#22d3ee',
              dark: '#0891b2',
              contrastText: '#0f172a',
            },
            secondary: {
              main: '#6366f1', // Indigo
              light: '#818cf8',
              dark: '#4f46e5',
            },
            background: {
              default: '#080c14', // Deep canvas for maximum contrast
              paper: '#151c2c',   // Dark card fallback
            },
            text: {
              primary: '#f8fafc',
              secondary: '#94a3b8',
            },
            divider: 'rgba(255, 255, 255, 0.1)',
            success: {
              main: '#10b981',
              light: '#34d399',
              dark: '#059669',
            },
            warning: {
              main: '#f59e0b',
              light: '#fbbf24',
              dark: '#d97706',
            },
            error: {
              main: '#ef4444',
              light: '#f87171',
              dark: '#dc2626',
            },
            info: {
              main: '#3b82f6',
              light: '#60a5fa',
              dark: '#2563eb',
            },
          }
        : {
            primary: {
              main: '#0284c7', // Slate Blue
              light: '#38bdf8',
              dark: '#0369a1',
              contrastText: '#ffffff',
            },
            secondary: {
              main: '#4f46e5',
              light: '#6366f1',
              dark: '#3730a3',
            },
            background: {
              default: '#f1f5f9', // Light slate canvas
              paper: '#ffffff',
            },
            text: {
              primary: '#0f172a',
              secondary: '#64748b',
            },
            divider: 'rgba(0, 0, 0, 0.08)',
            success: {
              main: '#10b981',
              light: '#a7f3d0',
              dark: '#047857',
            },
            warning: {
              main: '#f59e0b',
              light: '#fef3c7',
              dark: '#b45309',
            },
            error: {
              main: '#ef4444',
              light: '#fee2e2',
              dark: '#b91c1c',
            },
            info: {
              main: '#0284c7',
              light: '#e0f2fe',
              dark: '#0369a1',
            },
          }),
    },
    typography: {
      fontFamily: 'Geist, var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      h1: {
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '-0.025em',
      },
      h2: {
        fontSize: '1.5rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h3: {
        fontSize: '1.25rem',
        fontWeight: 600,
        letterSpacing: '-0.015em',
      },
      h4: {
        fontSize: '1.1rem',
        fontWeight: 600,
      },
      h5: {
        fontSize: '1rem',
        fontWeight: 600,
      },
      h6: {
        fontSize: '0.875rem',
        fontWeight: 600,
      },
      body1: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.75rem',
        lineHeight: 1.4,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
      },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderRadius: 8,
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: mode === 'dark' ? '0 4px 20px 0 rgba(0, 0, 0, 0.25)' : '0 4px 16px 0 rgba(148, 163, 184, 0.12)',
            border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
            padding: '12px 16px',
          },
          head: {
            fontWeight: 650,
            backgroundColor: mode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : '#f8fafc',
            color: mode === 'dark' ? '#94a3b8' : '#64748b',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'}`,
            boxShadow: mode === 'dark' ? '0 16px 48px rgba(0, 0, 0, 0.5)' : '0 16px 40px rgba(148, 163, 184, 0.25)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? 'rgba(11, 15, 25, 0.85)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
          },
        },
      },
    },
  });
};
