'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from './theme';

type ColorModeContextType = {
  mode: 'light' | 'dark';
  toggleColorMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextType>({
  mode: 'dark',
  toggleColorMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  // Always start with 'light' on both server and client to avoid SSR/client hydration mismatch.
  // The blocking <script> in layout.tsx already sets the correct background-color before paint,
  // so there is no visual flash even if a user later switches to dark.
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Read the correct theme from localStorage after hydration.
    // Default is 'light' — only switch to dark if explicitly saved by the user.
    const saved = localStorage.getItem('ykp-theme-mode') as 'light' | 'dark' | null;
    const resolvedMode = saved === 'dark' ? 'dark' : 'light';
    setMode(resolvedMode);

    // Sync theme across all open zones/tabs via StorageEvent
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === 'ykp-theme-mode' && (event.newValue === 'light' || event.newValue === 'dark')) {
        setMode(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  const toggleColorMode = () => {
    const nextMode = mode === 'light' ? 'dark' : 'light';
    setMode(nextMode);
    localStorage.setItem('ykp-theme-mode', nextMode);
  };

  const theme = React.useMemo(() => getTheme(mode), [mode]);

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
