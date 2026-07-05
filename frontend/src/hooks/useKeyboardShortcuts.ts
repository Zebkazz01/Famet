import { useEffect, useRef } from 'react';

export interface Shortcut {
  /** Tecla principal: 'F2', 'Enter', 'k', etc */
  key: string;
  /** Modifiers */
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  /** Acción a ejecutar */
  handler: (e: KeyboardEvent) => void;
  /** Permite que el atajo dispare aunque el foco esté en input */
  allowInInput?: boolean;
  /** Descripción para UI de configuración */
  description?: string;
}

/**
 * Registra atajos de teclado globales. Cada page llama esto con su map.
 * Persistencia opcional pendiente vía /api/preferences.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      for (const s of ref.current) {
        if (s.key.toLowerCase() !== e.key.toLowerCase()) continue;
        if ((s.ctrl ?? false) !== (e.ctrlKey || e.metaKey)) continue;
        if ((s.shift ?? false) !== e.shiftKey) continue;
        if ((s.alt ?? false) !== e.altKey) continue;
        if (isInput && !s.allowInInput) continue;
        e.preventDefault();
        s.handler(e);
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function formatShortcut(s: Pick<Shortcut, 'key' | 'ctrl' | 'shift' | 'alt'>): string {
  const parts: string[] = [];
  if (s.ctrl) parts.push('Ctrl');
  if (s.alt) parts.push('Alt');
  if (s.shift) parts.push('Shift');
  parts.push(s.key.toUpperCase());
  return parts.join('+');
}
