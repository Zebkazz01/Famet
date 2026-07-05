import { type ReactNode } from 'react';
import { DatePicker } from './DatePicker';
import { Button } from './Button';
import { LABEL_BASE, cn } from './tokens';

export interface DateRange {
  from?: string;
  to?: string;
}

export type DateRangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'prevMonth' | 'year';

const PRESETS: { id: DateRangePreset; label: string; compute: () => DateRange }[] = [
  {
    id: 'today',
    label: 'Hoy',
    compute: () => {
      const t = new Date().toISOString().slice(0, 10);
      return { from: t, to: t };
    },
  },
  {
    id: 'yesterday',
    label: 'Ayer',
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const s = d.toISOString().slice(0, 10);
      return { from: s, to: s };
    },
  },
  {
    id: 'week',
    label: 'Semana',
    compute: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 6);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    },
  },
  {
    id: 'month',
    label: 'Mes',
    compute: () => {
      const d = new Date();
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      return { from: from.toISOString().slice(0, 10), to: d.toISOString().slice(0, 10) };
    },
  },
  {
    id: 'prevMonth',
    label: 'Mes anterior',
    compute: () => {
      const d = new Date();
      const from = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const to = new Date(d.getFullYear(), d.getMonth(), 0);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    },
  },
  {
    id: 'year',
    label: 'Año',
    compute: () => {
      const d = new Date();
      const from = new Date(d.getFullYear(), 0, 1);
      return { from: from.toISOString().slice(0, 10), to: d.toISOString().slice(0, 10) };
    },
  },
];

export interface DateRangePickerProps {
  label?: ReactNode;
  value: DateRange;
  onChange: (v: DateRange) => void;
  presets?: DateRangePreset[];
  wrapperClassName?: string;
}

export function DateRangePicker({ label, value, onChange, presets, wrapperClassName }: DateRangePickerProps) {
  const enabledPresets = presets
    ? PRESETS.filter((p) => presets.includes(p.id))
    : PRESETS;
  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && <label className={LABEL_BASE}>{label}</label>}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <DatePicker
            value={value.from || ''}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            wrapperClassName="flex-1"
            placeholder="Desde"
          />
          <DatePicker
            value={value.to || ''}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            wrapperClassName="flex-1"
            placeholder="Hasta"
          />
        </div>
        {enabledPresets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {enabledPresets.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange(p.compute())}
              >
                {p.label}
              </Button>
            ))}
            {(value.from || value.to) && (
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => onChange({})}
              >
                Limpiar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
