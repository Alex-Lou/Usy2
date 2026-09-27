import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppTheme = "neo" | "scrapbook";

const KEY = "memocat.appTheme";

function readInitial(): AppTheme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "neo" || v === "scrapbook") return v;
  } catch {
    /* ignore */
  }
  return "neo";
}

interface AppThemeValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  toggle: () => void;
}

const AppThemeContext = createContext<AppThemeValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(readInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((t: AppTheme) => setThemeState(t), []);
  const toggle = useCallback(
    () => setThemeState((t) => (t === "neo" ? "scrapbook" : "neo")),
    [],
  );

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}
