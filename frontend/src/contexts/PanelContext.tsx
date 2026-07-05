import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface PanelContextType {
  sidebarOpen: boolean;
  cartOpen: boolean;
  cartCount: number;
  toggleSidebar: () => void;
  toggleCart: () => void;
  closePanels: () => void;
  setCartCount: (count: number) => void;
}

const PanelContext = createContext<PanelContextType>(null!);

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === 'true') return true;
    if (v === 'false') return false;
  } catch {}
  return fallback;
}

export function PanelProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => isMobile() ? false : readBool('fameat-sidebar', false));
  const [cartOpen, setCartOpen] = useState(() => isMobile() ? false : readBool('fameat-cart-open', false));
  const [cartCount, setCartCount] = useState(0);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => {
      const next = !v;
      if (next && isMobile()) setCartOpen(false);
      try { localStorage.setItem('fameat-sidebar', String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleCart = useCallback(() => {
    setCartOpen((v) => {
      const next = !v;
      if (next && isMobile()) setSidebarOpen(false);
      try { localStorage.setItem('fameat-cart-open', String(next)); } catch {}
      return next;
    });
  }, []);

  const closePanels = useCallback(() => {
    setSidebarOpen(false);
    setCartOpen(false);
  }, []);

  return (
    <PanelContext.Provider value={{ sidebarOpen, cartOpen, cartCount, toggleSidebar, toggleCart, closePanels, setCartCount }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  return useContext(PanelContext);
}
