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
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Initialize from localStorage during render (not in effect)
    const stored = localStorage.getItem('freshroute-theme');
    if (stored === 'light' || stored === 'dark') {
      return stored as ThemeMode;
    }
    // Check system preference
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  // Persist to localStorage when user explicitly changes (outside of effect)
  useEffect(() => {
    const html = document.documentElement;
    if (mode === 'system') {
      html.dataset.theme = '';
    } else {
      html.dataset.theme = mode;
    }
    localStorage.setItem('freshroute-theme', mode);
  }, [mode]);

  const setModeHandler = (newMode: ThemeMode) => {
    setMode(newMode);
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