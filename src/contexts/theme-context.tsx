'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type UIMode = 'agent' | 'human';

interface ThemeContextValue {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  toggleMode: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'clawplay-ui-mode';
const DEFAULT_MODE: UIMode = 'agent';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UIMode>(DEFAULT_MODE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as UIMode | null;
    if (stored === 'agent' || stored === 'human') {
      setModeState(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-ui-mode', mode);
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode, mounted]);

  const setMode = useCallback((newMode: UIMode) => {
    setModeState(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'agent' ? 'human' : 'agent'));
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      mode: DEFAULT_MODE,
      setMode: () => {},
      toggleMode: () => {},
      mounted: false,
    };
  }
  return context;
}
