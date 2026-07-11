import { useState, useMemo, useEffect } from 'react';
import { Table, SquaresFour, MagnifyingGlass, CaretLeft, CaretRight, X, MagnifyingGlassMinus, PlusCircle, Tray } from '@phosphor-icons/react';

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
  cardHidden?: boolean;
  searchable?: boolean;
}

interface ViewToggleProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: string;
  cardTitle: (item: T) => React.ReactNode;
  cardSubtitle?: (item: T) => React.ReactNode;
  cardBadge?: (item: T) => React.ReactNode;
  cardActions?: (item: T) => React.ReactNode;
  cardImage?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  searchInputProps?: React.InputHTMLAttributes<HTMLInputElement> & Record<string, string>;
  pageSize?: number;
  defaultView?: 'table' | 'cards';
  onCreateNew?: () => void;
  createNewLabel?: string;
  /** Key para persistir vista (tabla/cards) y perPage en localStorage */
  storageKey?: string;
}

const VIEW_PREFIX = 'fameat-view-toggle-';

export function ViewToggle<T extends Record<string, any>>({
  data, columns, keyField, cardTitle, cardSubtitle, cardBadge, cardActions, cardImage,
  emptyMessage = 'Sin datos', emptyIcon, searchPlaceholder = 'Buscar...',
  searchFilter, searchInputProps, pageSize = 10, defaultView = 'table',
  onCreateNew, createNewLabel = 'Crear nuevo', storageKey,
}: ViewToggleProps<T>) {
  const [view, setView] = useState<'table' | 'cards'>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`${VIEW_PREFIX}${storageKey}-view`);
        if (saved === 'table' || saved === 'cards') return saved;
      } catch {}
    }
    return defaultView;
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`${VIEW_PREFIX}${storageKey}-perPage`);
        const n = Number(saved);
        if (Number.isFinite(n) && n > 0) return n;
      } catch {}
    }
    return pageSize;
  });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // Persistir vista
  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(`${VIEW_PREFIX}${storageKey}-view`, view); } catch {}
  }, [view, storageKey]);
  // Persistir perPage
  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(`${VIEW_PREFIX}${storageKey}-perPage`, String(perPage)); } catch {}
  }, [perPage, storageKey]);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setView('cards');
    };
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // En móvil, mover columna de acciones al inicio
  const sortedColumns = useMemo(() => {
    if (!isMobile) return columns;
    const actionsIdx = columns.findIndex((c) => c.key === 'actions');
    if (actionsIdx <= 0) return columns;
    const reordered = [...columns];
    const [actions] = reordered.splice(actionsIdx, 1);
    reordered.unshift(actions);
    return reordered;
  }, [columns, isMobile]);

  const filtered = useMemo(() => {
    if (!search || !searchFilter) return data;
    return data.filter((item) => searchFilter(item, search.toLowerCase()));
  }, [data, search, searchFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  // Reset page on search/data change
  useMemo(() => setPage(0), [search, data.length]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {searchFilter && (
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlass size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                {...searchInputProps}
                className="w-full pl-8 pr-8 h-9 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          )}
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* View toggle + per page */}
        <div className="flex items-center gap-2">
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(0); }}
            className="text-xs border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg px-2 h-9 bg-white focus:outline-none"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n} / pág</option>
            ))}
          </select>
          {!isMobile && (
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-9">
              <button
                onClick={() => setView('table')}
                className={`h-full w-10 transition-colors flex items-center justify-center ${view === 'table' ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                title="Vista tabla"
              >
                <Table size={16} weight="duotone" />
              </button>
              <button
                onClick={() => setView('cards')}
                className={`h-full w-10 transition-colors flex items-center justify-center ${view === 'cards' ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                title="Vista tarjetas"
              >
                <SquaresFour size={16} weight="duotone" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {paged.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          {search ? (
            <>
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <MagnifyingGlassMinus size={32} weight="duotone" className="text-amber-500" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Sin resultados para "{search}"</p>
              <p className="text-sm text-gray-400 mb-4">Intenta con otro termino de busqueda</p>
              <div className="flex gap-2">
                <button onClick={() => setSearch('')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                  <X size={14} weight="bold" /> Borrar busqueda
                </button>
                {onCreateNew && (
                  <button onClick={onCreateNew}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                    <PlusCircle size={16} weight="duotone" /> {createNewLabel}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {emptyIcon || <Tray size={32} weight="duotone" className="text-gray-400" />}
              </div>
              <p className="font-semibold text-gray-700 mb-1">{emptyMessage}</p>
              <p className="text-sm text-gray-400 mb-4">No hay registros para mostrar</p>
              {onCreateNew && (
                <button onClick={onCreateNew}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                  <PlusCircle size={16} weight="duotone" /> {createNewLabel}
                </button>
              )}
            </>
          )}
        </div>
      ) : view === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider w-10">#</th>
                {sortedColumns.map((col) => (
                  <th key={col.key} className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((item, index) => (
                <tr key={item[keyField]} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 font-medium">{page * perPage + index + 1}</td>
                  {sortedColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3">{col.render(item)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {paged.map((item) => (
            <div key={item[keyField]} className="bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all overflow-hidden">
              <div className="flex">
                {/* Imagen cuadrada a la izquierda */}
                {cardImage && (
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {cardImage(item)}
                  </div>
                )}
                {/* Info a la derecha */}
                <div className="flex-1 min-w-0 p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-gray-800 truncate">{cardTitle(item)}</div>
                      {cardSubtitle && <div className="text-xs text-gray-500 mt-0.5">{cardSubtitle(item)}</div>}
                    </div>
                    {cardBadge && <div className="flex-shrink-0 ml-2">{cardBadge(item)}</div>}
                  </div>
                </div>
              </div>
              <div className="px-3 pb-2 space-y-1">
                {columns.filter((c) => !c.cardHidden).map((col) => (
                  <div key={col.key} className="flex justify-between text-xs">
                    <span className="text-gray-400 font-medium">{col.label}</span>
                    <span className="text-gray-700">{col.render(item)}</span>
                  </div>
                ))}
              </div>
              {cardActions && <div className="px-3 pb-3 pt-2 border-t border-gray-100 flex gap-2">{cardActions(item)}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-400">
            {page * perPage + 1}-{Math.min((page + 1) * perPage, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5));
              const p = start + i;
              if (p >= totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    p === page ? 'bg-red-500 text-white' : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
