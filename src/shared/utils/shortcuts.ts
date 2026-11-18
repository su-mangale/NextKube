'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ShortcutItem {
  id: string;
  label: string;
  description: string;
  defaultKey: string;
  key: string;
  category: 'Dock & Shell' | 'Cluster Management' | 'Navigation';
}

export const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  {
    id: 'console',
    label: 'KubeConsole Terminal',
    description: 'Toggle in-cluster interactive KubeConsole terminal drawer',
    defaultKey: 'Ctrl+\\',
    key: 'Ctrl+\\',
    category: 'Dock & Shell',
  },
  {
    id: 'create',
    label: 'Apply / Create Manifest',
    description: 'Open Kubernetes YAML creation dialog',
    defaultKey: 'Alt+A',
    key: 'Alt+A',
    category: 'Dock & Shell',
  },
  {
    id: 'addCluster',
    label: 'Add / Attach Cluster',
    description: 'Open onboarding dialog to attach cluster via Kubeconfig',
    defaultKey: 'Alt+N',
    key: 'Alt+N',
    category: 'Cluster Management',
  },
  {
    id: 'switchCluster',
    label: 'Switch Cluster Selector',
    description: 'Open fast cluster switching menu',
    defaultKey: 'Alt+S',
    key: 'Alt+S',
    category: 'Cluster Management',
  },
  {
    id: 'settings',
    label: 'Settings Window',
    description: 'Open Workspace & System Settings dialog',
    defaultKey: 'Alt+,',
    key: 'Alt+,',
    category: 'Navigation',
  },
  {
    id: 'toggleDock',
    label: 'Toggle Action Dock',
    description: 'Expand or collapse the floating action dock',
    defaultKey: 'Alt+D',
    key: 'Alt+D',
    category: 'Dock & Shell',
  },
  {
    id: 'refresh',
    label: 'Refresh Cluster Resources',
    description: 'Trigger full live refresh of all cluster workloads & telemetry',
    defaultKey: 'Alt+R',
    key: 'Alt+R',
    category: 'Navigation',
  },
];

const STORAGE_KEY = 'nextkube-keyboard-shortcuts';
const EVENT_NAME = 'nextkube-shortcuts-updated';

export function getStoredShortcuts(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveShortcut(id: string, newKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = getStoredShortcuts();
    stored[id] = newKey;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to save shortcut:', err);
  }
}

export function resetShortcutsToDefault(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to reset shortcuts:', err);
  }
}

export function matchesShortcut(e: KeyboardEvent, shortcutKey: string): boolean {
  if (!shortcutKey) return false;
  const parts = shortcutKey.split('+').map((p) => p.trim());
  const needsCtrl = parts.some((p) => p.toLowerCase() === 'ctrl' || p.toLowerCase() === 'control');
  const needsAlt = parts.some((p) => p.toLowerCase() === 'alt');
  const needsShift = parts.some((p) => p.toLowerCase() === 'shift');
  const needsMeta = parts.some((p) => p.toLowerCase() === 'meta' || p.toLowerCase() === 'cmd');

  const mainKey = parts.find(
    (p) => !['ctrl', 'control', 'alt', 'shift', 'meta', 'cmd'].includes(p.toLowerCase())
  );

  if (needsCtrl && !e.ctrlKey) return false;
  if (!needsCtrl && e.ctrlKey) return false;

  if (needsAlt && !e.altKey) return false;
  if (!needsAlt && e.altKey) return false;

  if (needsShift && !e.shiftKey) return false;
  if (!needsShift && e.shiftKey) return false;

  if (needsMeta && !e.metaKey) return false;
  if (!needsMeta && e.metaKey) return false;

  if (!mainKey) return true;

  const eventKey = e.key.toLowerCase();
  const targetKey = mainKey.toLowerCase();

  if (targetKey === '\\') return eventKey === '\\' || e.code === 'Backslash';
  if (targetKey === ',') return eventKey === ',' || e.code === 'Comma';
  if (targetKey === '.') return eventKey === '.' || e.code === 'Period';
  if (targetKey === '/') return eventKey === '/' || e.code === 'Slash';

  return eventKey === targetKey || e.code.toLowerCase() === `key${targetKey}`;
}

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>(() => {
    return DEFAULT_SHORTCUTS;
  });

  const reloadShortcuts = useCallback(() => {
    const stored = getStoredShortcuts();
    setShortcuts(
      DEFAULT_SHORTCUTS.map((item) => ({
        ...item,
        key: stored[item.id] || item.defaultKey,
      }))
    );
  }, []);

  useEffect(() => {
    reloadShortcuts();

    const handleUpdate = () => reloadShortcuts();
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [reloadShortcuts]);

  const updateKey = (id: string, newKey: string) => {
    saveShortcut(id, newKey);
  };

  const resetAll = () => {
    resetShortcutsToDefault();
  };

  return {
    shortcuts,
    getShortcutKey: (id: string) => shortcuts.find((s) => s.id === id)?.key || '',
    updateKey,
    resetAll,
  };
}
