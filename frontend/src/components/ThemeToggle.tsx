import React, { useState, useEffect, createContext, ReactNode, useContext } from 'react';
import { Sun, Moon } from 'lucide-react';

export type ThemeMode = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggled: () => void;
}>({
  mode: 'system',
  setMode: () => {},
  toggled: () => {},
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isUserSet, setIsUserSet] = useState<boolean>(false);

  // Initialize from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('freshroute-theme');
    if (stored === 'light' || stored === 'dark') {
      setMode(stored as ThemeMode);
      setIsUserSet(true);
      const html = document.documentElement;
      html.dataset.theme = stored;
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
      const html = document.documentElement;
      html.dataset.theme = prefersDark ? 'dark' : 'light';
    }
  }, []);

  // Persist to localStorage when user explicitly changes
  useEffect(() => {
    if (!isUserSet) return;
    localStorage.setItem('freshroute-theme', mode);
  }, [mode, isUserSet]);

  // Sync data-theme attribute on mount/unmount
  useEffect(() => {
    const html = document.documentElement;
    if (mode === 'system') {
      html.dataset.theme = '';
    } else {
      html.dataset.theme = mode;
    }
  }, [mode]);

  const setModeHandler = (newMode: ThemeMode) => {
    setMode(newMode);
    setIsUserSet(newMode !== 'system');
  };

  const toggle = () => {
    setMode(prev => {
      if (prev === 'system') return 'dark';
      if (prev === 'dark') return 'light';
      return 'system';
    });
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode: setModeHandler, toggled: toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export const ThemeToggle: React.FC = () => {
  const { mode, toggled } = useTheme();

  return (
    <button
      onClick={toggled}
      aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`}
      className="rounded-md p-2 transition-colors duration-200 focus-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      title={`Theme toggle, currently ${mode}`}
    >
      {mode === 'dark' ? (
        <Sun className="w-4 h-4 text-primary" />
      ) : (
        <Moon className="w-4 h-4 text-primary" />
      )}
    </button>
  );
};