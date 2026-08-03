import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { Funnel, X, ArrowsClockwise } from '@phosphor-icons/react';
import { Badge } from './Badge';
import { cn } from './tokens';

interface DropdownChip {
  key: string;
  label: ReactNode;
  onRemove?: () => void;
}

interface FilterDropdownProps {
  activeCount: number;
  onClear: () => void;
  chips?: DropdownChip[];
  children: ReactNode;
  storageKey?: string;
}

const STORAGE_PREFIX = 'fameat-filter-dropdown-';

export function FilterDropdown({
  activeCount,
  onClear,
  chips,
  children,
  storageKey,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(STORAGE_PREFIX + storageKey);
        if (saved !== null) return saved === 'true';
      } catch {}
    }
    return false;
  });
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (!(e.target as HTMLElement)?.closest?.('[data-combobox-dropdown]')) {
          setOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Persist open state
  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(STORAGE_PREFIX + storageKey, String(open)); } catch {}
  }, [open, storageKey]);

  // Global Ctrl+Shift+F shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setOpen((prev) => {
          const next = !prev;
          if (next) {
            // Auto-focus first filter element after panel opens
            setTimeout(() => {
              const el = panelRef.current?.querySelector<HTMLElement>(
                'input:not([disabled]), select:not([disabled]), button:not([data-combobox-dropdown])'
              );
              el?.focus();
            }, 50);
          }
          return next;
        });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Esc key: close panel or clear focused filter
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      const active = document.activeElement as HTMLElement;
      if (!panelRef.current?.contains(active)) return;

      // If focused on a Combobox trigger or input, find its clear button
      const comboboxContainer = active.closest('[data-combobox-container]');
      if (comboboxContainer) {
        const clearBtn = comboboxContainer.querySelector<HTMLButtonElement>('[data-combobox-clear]');
        if (clearBtn) {
          e.preventDefault();
          clearBtn.click();
          return;
        }
      }

      // If focused on a select, reset to first option
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

  // Focus first element when panel opens
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), button:not([data-combobox-dropdown])'
      );
      el?.focus();
    }, 50);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-colors border',
          open || activeCount > 0
            ? 'bg-red-50 border-red-300 text-red-600 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
        )}
        title="Filtros (Ctrl+Shift+F)"
      >
        <Funnel size={14} weight="duotone" />
        <span className="hidden sm:inline">Filtros</span>
        {activeCount > 0 && <Badge variant="red" size="xs">{activeCount}</Badge>}
      </button>

      {open && (
        <div ref={panelRef} className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 p-4 min-w-[280px] max-w-[400px] max-h-[70vh] overflow-auto">
          {chips && chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {chips.map((c) => (
                <span key={c.key} className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] px-2 py-0.5 rounded-lg">
                  {c.label}
                  {c.onRemove && (
                    <button type="button" onClick={c.onRemove} className="hover:text-red-900 dark:hover:text-red-200">
                      <X size={10} weight="bold" />
                    </button>
                  )}
                </span>
              ))}
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-[10px] text-red-500 hover:text-red-700 font-medium ml-1"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
          <div className="space-y-3">{children}</div>
          <p className="text-[10px] text-gray-400 mt-3 border-t border-gray-100 dark:border-gray-700 pt-2">
            Esc para limpiar filtro enfocado · Ctrl+Shift+F para cerrar
          </p>
        </div>
      )}
    </div>
  );
}

interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
}

export function RefreshButton({ onClick, loading }: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = useCallback(() => {
    setSpinning(true);
    onClick();
    setTimeout(() => setSpinning(false), 800);
  }, [onClick]);

  const isSpinning = loading || spinning;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-colors border bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
      title="Recargar datos"
    >
      <ArrowsClockwise size={14} weight="duotone" className={isSpinning ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">Recargar</span>
    </button>
  );
}
