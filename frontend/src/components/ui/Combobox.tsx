import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, MagnifyingGlass, Check, X } from '@phosphor-icons/react';
import { LABEL_BASE, HINT_BASE, ERROR_BASE, cn, inputClass } from './tokens';

export interface ComboboxOption {
  label: string;
  value: string;
  hint?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: ComboboxOption[];
  value?: string | string[] | null;
  onChange?: (value: string | string[] | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  multi?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  wrapperClassName?: string;
  renderOption?: (opt: ComboboxOption) => ReactNode;
  /** Icono al inicio del campo (lado izquierdo) */
  icon?: ReactNode;
}

export function Combobox({
  label,
  hint,
  error,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  multi = false,
  clearable = true,
  disabled,
  wrapperClassName,
  renderOption,
  icon,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);

  const selectedValues = useMemo(() => {
    if (value === null || value === undefined || value === '') return [] as string[];
    return Array.isArray(value) ? value.filter((v) => v !== '') : [value];
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(q) ||
      o.value.toLowerCase().includes(q) ||
      (o.hint && o.hint.toLowerCase().includes(q)),
    );
  }, [options, query]);

  useEffect(() => { setHighlight(0); }, [query, open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    }
    if (open) {
      document.addEventListener('mousedown', onClickOutside);
      return () => document.removeEventListener('mousedown', onClickOutside);
    }
  }, [open]);

  // Calcular posición del dropdown relativo al viewport (Portal)
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 320; // estimación max-h-80
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    setPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  }, [open]);

  // Recalcular en scroll/resize mientras está abierto
  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      setPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUp,
      });
    }
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  function toggle(val: string) {
    if (!onChange) return;
    if (multi) {
      const next = selectedValues.includes(val)
        ? selectedValues.filter((v) => v !== val)
        : [...selectedValues, val];
      onChange(next);
    } else {
      onChange(val);
      setOpen(false);
      setQuery('');
    }
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation();
    onChange?.(multi ? [] : null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt && !opt.disabled) toggle(opt.value);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  const showError = Boolean(error);
  const labelOfValue = (v: string) => options.find((o) => o.value === v)?.label || v;

  return (
    <div className={cn('w-full', wrapperClassName)} data-combobox-container>
      {label && <label className={LABEL_BASE}>{label}</label>}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={cn(inputClass({ error: showError }), 'text-left flex items-center gap-2 cursor-pointer pr-9 min-h-[2.5rem]', icon ? 'pl-9' : '')}
        >
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
              {icon}
            </span>
          )}
          <span className="flex-1 truncate flex items-center gap-1 flex-wrap">
            {selectedValues.length === 0 && (
              <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
            )}
            {multi && selectedValues.length > 0 && selectedValues.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-lg text-xs">
                {labelOfValue(v)}
                <button type="button" onClick={(e) => { e.stopPropagation(); toggle(v); }} className="hover:text-red-900">
                  <X size={10} weight="bold" />
                </button>
              </span>
            ))}
            {!multi && selectedValues[0] && (
              <span className="text-gray-900 dark:text-gray-100">{labelOfValue(selectedValues[0])}</span>
            )}
          </span>
          {clearable && selectedValues.length > 0 && (
            <span onClick={clearAll} data-combobox-clear className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={14} />
            </span>
          )}
          <CaretDown size={14} className={cn('absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform', open && 'rotate-180')} />
        </button>

        {open && pos && createPortal(
          <div
            ref={dropdownRef}
            data-combobox-dropdown
            style={{
              position: 'fixed',
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              width: pos.width,
              zIndex: 100000,
            }}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="relative border-b border-gray-100 dark:border-gray-700">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              />
            </div>
            <ul className="max-h-72 overflow-auto styled-scroll py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-gray-400 text-center">Sin resultados</li>
              ) : filtered.map((opt, idx) => {
                const selected = selectedValues.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => toggle(opt.value)}
                      onMouseEnter={() => setHighlight(idx)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors',
                        idx === highlight ? 'bg-gray-100 dark:bg-slate-700' : '',
                        selected ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-800 dark:text-gray-200',
                        opt.disabled && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <span className="flex-1">
                        {renderOption ? renderOption(opt) : (
                          <>
                            <span>{opt.label}</span>
                            {opt.hint && <span className="ml-2 text-[10px] text-gray-400">{opt.hint}</span>}
                          </>
                        )}
                      </span>
                      {selected && <Check size={14} weight="bold" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
      </div>
      {showError ? <p className={ERROR_BASE}>{error}</p> : hint ? <p className={HINT_BASE}>{hint}</p> : null}
    </div>
  );
}
