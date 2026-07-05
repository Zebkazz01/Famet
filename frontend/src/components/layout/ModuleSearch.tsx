import { useEffect, useRef } from 'react';
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommandSearch } from '../../hooks/useCommandSearch';
import { Portal } from '../Portal';
import type { Role } from '../../config/commands';

export function ModuleSearch() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const role = (user?.role as Role | undefined) || null;
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    open, setOpen, query, setQuery, results, highlight, setHighlight, run, onKeyDown,
  } = useCommandSearch({ role });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-colors w-full max-w-md lg:max-w-lg xl:max-w-2xl ${
          isDark
            ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        <MagnifyingGlass size={14} weight="bold" />
        <span className="flex-1 text-left">Buscar módulos y acciones...</span>
        <kbd className={`px-1.5 py-0.5 text-[10px] rounded-lg border font-mono ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>Ctrl K</kbd>
      </button>

      {/* Versión mobile: solo icono */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`md:hidden p-1.5 rounded-lg ${
          isDark ? 'text-red-200 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
        }`}
        title="Buscar (Ctrl+K)"
      >
        <MagnifyingGlass size={18} weight="bold" />
      </button>

      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
            onClick={() => setOpen(false)}
          >
            <div
              className={`w-full max-w-xl rounded-xl shadow-2xl overflow-hidden ${
                isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`flex items-center gap-2 px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <MagnifyingGlass size={18} className="text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Buscar módulos, acciones, configuración..."
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                />
                <kbd className={`px-1.5 py-0.5 text-[10px] rounded-lg border font-mono ${
                  isDark ? 'bg-slate-900 border-slate-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'
                }`}>Esc</kbd>
              </div>

              <ul className="max-h-80 overflow-auto styled-scroll py-1">
                {results.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-gray-400">
                    Sin resultados para "{query}"
                  </li>
                ) : results.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const active = idx === highlight;
                  return (
                    <li key={cmd.id}>
                      <button
                        type="button"
                        onClick={() => run(cmd)}
                        onMouseEnter={() => setHighlight(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          active
                            ? isDark ? 'bg-slate-700' : 'bg-gray-100'
                            : ''
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          cmd.section === 'action'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          <Icon size={16} weight="duotone" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {cmd.label}
                          </p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                            {cmd.section === 'action' ? 'Acción' : 'Módulo'}
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-gray-400" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className={`px-4 py-2 text-[10px] flex items-center justify-between border-t ${
                isDark ? 'bg-slate-900/50 border-slate-700 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'
              }`}>
                <span>↑↓ navegar · Enter abrir · Esc cerrar</span>
                <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
