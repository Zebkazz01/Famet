import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, useRef } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

const STORAGE_KEY = 'fameat-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, theme);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#111827' : '#ffffff');
    }
    document.body.style.background = theme === 'dark' ? '#0f172a' : '#f3f4f6';
  }, [theme]);

  const toggleTheme = useCallback((e?: React.MouseEvent) => {
    const switchFn = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

    // Si no soporta View Transitions o no hay evento, cambio directo
    if (!(document as any).startViewTransition || !e) {
      switchFn();
      return;
    }

    const isMobile = window.innerWidth < 768;

    const transition = (document as any).startViewTransition(() => {
      switchFn();
    });

    transition.ready.then(() => {
      if (isMobile) {
        // Móvil: fade rápido (menos pesado que clip-path)
        document.documentElement.animate(
          { opacity: [0, 1] },
          { duration: 250, easing: 'ease-out', pseudoElement: '::view-transition-new(root)' },
        );
      } else {
        // PC: animación circular desde punto de click
        const x = e.clientX;
        const y = e.clientY;
        const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          { duration: 500, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
        );
      }
    }).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
