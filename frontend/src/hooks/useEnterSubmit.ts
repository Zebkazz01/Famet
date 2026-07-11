import { useEffect } from 'react';

export function useEnterSubmit(onSubmit: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        onSubmit();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onSubmit, enabled]);
}
