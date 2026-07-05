import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { LABEL_BASE, HINT_BASE, ERROR_BASE, cn, inputClass } from './tokens';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options?: SelectOption[];
  wrapperClassName?: string;
  placeholder?: string;
  /** Icono al inicio del campo (lado izquierdo) */
  icon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, wrapperClassName, className, id, children, placeholder, icon, ...rest },
  ref,
) {
  const selectId = id || rest.name || undefined;
  const showError = Boolean(error);
  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <label htmlFor={selectId} className={LABEL_BASE}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none z-10">
            {icon}
          </span>
        )}
        <select
          ref={ref}
          id={selectId}
          {...rest}
          className={cn(inputClass({ error: showError }), 'pr-8 appearance-none cursor-pointer', icon ? 'pl-9' : '', className)}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
      </div>
      {showError ? <p className={ERROR_BASE}>{error}</p> : hint ? <p className={HINT_BASE}>{hint}</p> : null}
    </div>
  );
});
