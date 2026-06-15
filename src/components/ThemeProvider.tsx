import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ThemePreference } from "@/lib/themePreference";

type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemePreference;
  enableSystem?: boolean;
}

const THEME_STORAGE_KEY = "theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

let transitionStyle: HTMLStyleElement | null = null;
let transitionFrame: number | null = null;

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const getStoredTheme = (
  defaultTheme: ThemePreference,
  enableSystem: boolean,
): ThemePreference => {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (
    storedTheme === "light" ||
    storedTheme === "dark" ||
    (enableSystem && storedTheme === "system")
  ) {
    return storedTheme;
  }

  return enableSystem ? defaultTheme : "light";
};

const resolveTheme = (
  theme: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme => (theme === "system" ? systemTheme : theme);

const suppressThemeTransitions = () => {
  transitionStyle?.remove();
  if (transitionFrame !== null) {
    window.cancelAnimationFrame(transitionFrame);
  }

  transitionStyle = document.createElement("style");
  transitionStyle.dataset.themeTransitionGuard = "true";
  transitionStyle.textContent =
    "*, *::before, *::after { transition: none !important; }";
  document.head.appendChild(transitionStyle);

  transitionFrame = window.requestAnimationFrame(() => {
    transitionFrame = window.requestAnimationFrame(() => {
      transitionStyle?.remove();
      transitionStyle = null;
      transitionFrame = null;
    });
  });
};

const applyResolvedTheme = (
  theme: ResolvedTheme,
  disableTransitions = false,
) => {
  if (disableTransitions) {
    suppressThemeTransitions();
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    getStoredTheme(defaultTheme, enableSystem),
  );
  const [systemTheme, setSystemTheme] =
    useState<ResolvedTheme>(getSystemTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(
      getStoredTheme(defaultTheme, enableSystem),
      getSystemTheme(),
    ),
  );
  const themeRef = useRef(theme);

  useLayoutEffect(() => {
    const currentSystemTheme = getSystemTheme();
    const currentResolvedTheme = resolveTheme(
      themeRef.current,
      currentSystemTheme,
    );

    applyResolvedTheme(currentResolvedTheme);
    setSystemTheme(currentSystemTheme);
    setResolvedTheme(currentResolvedTheme);
  }, []);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    const currentSystemTheme = getSystemTheme();
    const nextResolvedTheme = resolveTheme(nextTheme, currentSystemTheme);

    themeRef.current = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyResolvedTheme(nextResolvedTheme, true);
    setThemeState(nextTheme);
    setSystemTheme(currentSystemTheme);
    setResolvedTheme(nextResolvedTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = () => {
      const nextSystemTheme: ResolvedTheme = mediaQuery.matches
        ? "dark"
        : "light";
      setSystemTheme(nextSystemTheme);

      if (themeRef.current === "system") {
        applyResolvedTheme(nextSystemTheme, true);
        setResolvedTheme(nextSystemTheme);
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () =>
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, systemTheme, setTheme }),
    [resolvedTheme, setTheme, systemTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
};
