import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Calendar } from '@phosphor-icons/react';
import { LABEL_BASE, HINT_BASE, ERROR_BASE, cn, inputClass } from './tokens';

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  /** "date" (default), "datetime-local", o "month" */
  variant?: 'date' | 'datetime-local' | 'month';
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { label, hint, error, wrapperClassName, className, id, variant = 'date', ...rest },
  ref,
) {
  const inputId = id || rest.name || undefined;
  const showError = Boolean(error);
  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className={LABEL_BASE}>
          {label}
        </label>
      )}
      <div className="relative">
        <Calendar size={16} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={ref}
          id={inputId}
          type={variant}
          {...rest}
          className={cn(inputClass({ error: showError }), 'pl-9', className)}
        />
      </div>
      {showError ? <p className={ERROR_BASE}>{error}</p> : hint ? <p className={HINT_BASE}>{hint}</p> : null}
    </div>
  );
});
