import { useRef, useEffect, type ReactNode } from 'react';

interface FilterPanelProps {
  children: ReactNode;
  open: boolean;
}

/**
 * Collapsible filter panel content. The toggle button should be
 * rendered separately in PageHeader actions.
 * - Auto-focuses first element when opened via Ctrl+Shift+F
 * - Esc clears the focused filter element
 * - TAB navigation between filter elements
 */
export function FilterPanel({ children, open }: FilterPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // TAB navigation within filters when open
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      );
      if (focusable.length === 0) return;

      const active = document.activeElement;
      const isInFilters = containerRef.current.contains(active);
      if (!isInFilters) return;

      e.preventDefault();
      const idx = Array.from(focusable).indexOf(active as HTMLElement);
      const next = e.shiftKey
        ? (idx - 1 + focusable.length) % focusable.length
        : (idx + 1) % focusable.length;
      focusable[next].focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Esc key: clear focused filter
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      const active = document.activeElement as HTMLElement;
      if (!containerRef.current?.contains(active)) return;

      // If focused on a Combobox trigger, find its clear button
      const comboboxContainer = active.closest('[data-combobox-container]');
      if (comboboxContainer) {
        const clearBtn = comboboxContainer.querySelector<HTMLButtonElement>('[data-combobox-clear]');
        if (clearBtn) {
          e.preventDefault();
          clearBtn.click();
          return;
        }
      }

      // If focused on a select, reset
      if (active.tagName === 'SELECT') {
        e.preventDefault();
        (active as HTMLSelectElement).value = '';
        active.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      // If focused on a text input, clear it
      if (active.tagName === 'INPUT' && (active as HTMLInputElement).type === 'text') {
        e.preventDefault();
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        nativeInputValueSetter?.call(active, '');
        active.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        {children}
      </div>
      <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
        Esc para limpiar filtro enfocado · Ctrl+Shift+F para cerrar
      </p>
    </div>
  );
}
