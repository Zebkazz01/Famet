import { type ReactNode, useState, useEffect } from 'react';
import { Funnel, CaretDown, X } from '@phosphor-icons/react';
import { cn } from './tokens';
import { Button } from './Button';
import { Badge } from './Badge';

export interface FilterChip {
  key: string;
  label: ReactNode;
  onRemove?: () => void;
}

export interface FilterPanelProps {
  title?: ReactNode;
  /** Cantidad de filtros activos para el badge. */
  activeCount?: number;
  /** Chips de filtros activos (visibles arriba). */
  chips?: FilterChip[];
  /** Limpia todos los filtros. */
  onClear?: () => void;
  /** Inicialmente abierto en desktop, cerrado en mobile. Default: true desktop. */
  defaultOpen?: boolean;
  /** Layout de los hijos. Default: grid-cols-1 md:grid-cols-3 */
  childrenLayout?: string;
  /** Key para persistir estado abierto/cerrado en localStorage. Si se omite, no recuerda. */
  storageKey?: string;
  children: ReactNode;
  className?: string;
}

const STORAGE_PREFIX = 'fameat-filter-panel-';

export function FilterPanel({
  title = 'Filtros',
  activeCount = 0,
  chips,
  onClear,
  defaultOpen = true,
  childrenLayout = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3',
  storageKey,
  children,
  className,
}: FilterPanelProps) {
  const [open, setOpen] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(STORAGE_PREFIX + storageKey);
        if (saved !== null) return saved === 'true';
      } catch {}
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(STORAGE_PREFIX + storageKey, String(open)); } catch {}
  }, [open, storageKey]);

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Funnel size={16} weight="duotone" className="text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</span>
          {activeCount > 0 && (
            <Badge variant="red" size="xs">{activeCount}</Badge>
          )}
        </div>
        <CaretDown
          size={14}
          className={cn('text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {chips && chips.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs px-2 py-0.5 rounded-lg"
            >
              {c.label}
              {c.onRemove && (
                <button
                  type="button"
                  onClick={c.onRemove}
                  className="hover:text-red-900 dark:hover:text-red-200"
                >
                  <X size={10} weight="bold" />
                </button>
              )}
            </span>
          ))}
          {onClear && activeCount > 0 && (
            <Button type="button" size="sm" variant="danger" onClick={onClear}>
              Limpiar todo
            </Button>
          )}
        </div>
      )}

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
          <div className={childrenLayout}>{children}</div>
        </div>
      )}
    </div>
  );
}
