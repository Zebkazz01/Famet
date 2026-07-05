import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from './tokens';

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
}

const Ctx = createContext<TabsCtx | null>(null);

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, defaultValue = '', onChange, children, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value !== undefined ? value : internal;
  const setValue = (v: string) => {
    if (value === undefined) setInternal(v);
    onChange?.(v);
  };
  const ctx = useMemo(() => ({ value: current, setValue }), [current]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Ctx.Provider value={ctx}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto',
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Tab({ value, children, className, disabled }: TabProps) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('<Tab> must be inside <Tabs>');
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      disabled={disabled}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px',
        active
          ? 'text-red-500 border-red-500 dark:text-red-400 dark:border-red-400'
          : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('<TabPanel> must be inside <Tabs>');
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
