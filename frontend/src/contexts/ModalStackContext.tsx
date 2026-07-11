import { createContext, useContext, useCallback, useRef, useEffect, type ReactNode } from 'react';

interface ModalStackContextValue {
  push: (close: () => void) => void;
  pop: (close: () => void) => void;
  popTop: () => void;
}

const ModalStackContext = createContext<ModalStackContextValue | null>(null);

export function ModalStackProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<(() => void)[]>([]);

  const push = useCallback((close: () => void) => {
    stackRef.current.push(close);
  }, []);

  const pop = useCallback((close: () => void) => {
    const idx = stackRef.current.indexOf(close);
    if (idx >= 0) stackRef.current.splice(idx, 1);
  }, []);

  const popTop = useCallback(() => {
    stackRef.current.pop()?.();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (stackRef.current.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      popTop();
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [popTop]);

  return (
    <ModalStackContext.Provider value={{ push, pop, popTop }}>
      {children}
    </ModalStackContext.Provider>
  );
}

export function useModalEscape(close: (() => void) | null) {
  const ctx = useContext(ModalStackContext);
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!ctx || !close) return;
    const handler = () => closeRef.current?.();
    ctx.push(handler);
    return () => ctx.pop(handler);
  }, [ctx, close]);
}
