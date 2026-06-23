import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppearanceMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'taskit.appearance';

const isAppearanceMode = (value: string | null): value is AppearanceMode =>
  value === 'system' || value === 'light' || value === 'dark';

const readStoredMode = (): AppearanceMode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isAppearanceMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

const getSystemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const resolveAppearanceIsDark = (mode: AppearanceMode): boolean => {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return getSystemPrefersDark();
};

export const applyAppearanceToDocument = (mode: AppearanceMode) => {
  const isDark = resolveAppearanceIsDark(mode);
  document.documentElement.classList.toggle('dark', isDark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    isDark ? '#111827' : '#059669',
  );
};

type AppearanceContextValue = {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
  isDark: boolean;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>(() => readStoredMode());
  const [isDark, setIsDark] = useState(() => resolveAppearanceIsDark(readStoredMode()));

  const setMode = useCallback((next: AppearanceMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
    applyAppearanceToDocument(next);
    setIsDark(resolveAppearanceIsDark(next));
  }, []);

  useEffect(() => {
    applyAppearanceToDocument(mode);
    setIsDark(resolveAppearanceIsDark(mode));
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyAppearanceToDocument('system');
      setIsDark(resolveAppearanceIsDark('system'));
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode, isDark }), [mode, setMode, isDark]);

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }
  return ctx;
}
