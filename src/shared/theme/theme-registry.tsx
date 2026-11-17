'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from './theme';

type ColorModeContextType = {
  mode: 'light' | 'dark';
  toggleColorMode: () => void;
  setColorMode: (newMode: 'light' | 'dark') => void;
};

const ColorModeContext = createContext<ColorModeContextType>({
  mode: 'dark',
  toggleColorMode: () => {},
  setColorMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  // Always start with 'light' on both server and client to avoid SSR/client hydration mismatch.
  // The blocking <script> in layout.tsx already sets the correct background-color before paint,
  // so there is no visual flash even if a user later switches to dark.
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const applyDomTheme = (themeMode: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', themeMode);
      if (themeMode === 'light') {
        document.documentElement.style.backgroundColor = '#f8fafc';
        document.documentElement.style.color = '#0f172a';
      } else {
        document.documentElement.style.backgroundColor = '#0b0f19';
        document.documentElement.style.color = '#f8fafc';
      }
    }
  };

  useEffect(() => {
    // Read the correct theme from localStorage after hydration.
    // Default is 'dark' or 'light'
    const saved = localStorage.getItem('ykp-theme-mode') as 'light' | 'dark' | null;
    const resolvedMode = saved === 'light' ? 'light' : 'dark';
    setMode(resolvedMode);
    applyDomTheme(resolvedMode);

    // Sync theme across all open zones/tabs via StorageEvent
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === 'ykp-theme-mode' && (event.newValue === 'light' || event.newValue === 'dark')) {
        setMode(event.newValue);
        applyDomTheme(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  const setColorMode = (newMode: 'light' | 'dark') => {
    setMode(newMode);
    localStorage.setItem('ykp-theme-mode', newMode);
    applyDomTheme(newMode);
  };

  const toggleColorMode = () => {
    const nextMode = mode === 'light' ? 'dark' : 'light';
    setColorMode(nextMode);
  };

  const theme = React.useMemo(() => getTheme(mode), [mode]);

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ColorModeContext.Provider value={{ mode, toggleColorMode, setColorMode }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
