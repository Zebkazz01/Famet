import { useState, useEffect, useRef } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  prefix?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function formatWithThousands(val: string): string {
  if (!val) return '';
  const num = val.replace(/[^\d]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('es-CO');
}

function rawValue(formatted: string): string {
  const num = formatted.replace(/[^\d]/g, '');
  return num || '';
}

export function CurrencyInput({
  value, onChange, placeholder = '0', required, autoFocus, className = '', prefix = true, onKeyDown,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(() => formatWithThousands(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(formatWithThousands(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = rawValue(e.target.value);
    setDisplay(formatWithThousands(raw));
    onChange(raw);
  };

  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        className={`${prefix ? 'pl-7' : ''} ${className}`}
      />
    </div>
  );
}
