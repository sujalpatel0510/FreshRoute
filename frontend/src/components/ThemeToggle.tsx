import React, { useState, useEffect, useRef, createContext, type ReactNode, useContext } from 'react';
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

  const themeAnimTimer = useRef<number | undefined>(undefined);

  // Must run synchronously inside the click handler — BEFORE React commits
  // the new data-theme attribute — otherwise the transition class lands
  // after the colors have already snapped and the cross-fade never plays.
  const beginThemeTransition = () => {
    const html = document.documentElement;
    html.classList.add('theme-animating');
    window.clearTimeout(themeAnimTimer.current);
    themeAnimTimer.current = window.setTimeout(() => html.classList.remove('theme-animating'), 360);
  };

  // Apply theme attribute + persistence
  useEffect(() => {
    const html = document.documentElement;
    if (mode === 'system') {
      // Empty attribute = follow OS preference via the CSS media fallback
      html.dataset.theme = '';
    } else {
      html.dataset.theme = mode;
    }
    localStorage.setItem('freshroute-theme', mode);
  }, [mode]);

  useEffect(() => () => window.clearTimeout(themeAnimTimer.current), []);

  const setModeHandler = (newMode: ThemeMode) => {
    beginThemeTransition();
    setMode(newMode);
  };

  const toggle = () => {
    beginThemeTransition();
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
      className="btn-press rounded-md p-2 focus-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      title={`Theme toggle, currently ${mode}`}
    >
      <span key={mode} className="theme-icon-in inline-flex">
        {mode === 'dark' ? (
          <Sun className="w-4 h-4 text-primary" />
        ) : (
          <Moon className="w-4 h-4 text-primary" />
        )}
      </span>
    </button>
  );
};