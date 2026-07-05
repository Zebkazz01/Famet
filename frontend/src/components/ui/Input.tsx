import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { LABEL_BASE, HINT_BASE, ERROR_BASE, cn, inputClass } from './tokens';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, suffix, wrapperClassName, className, id, ...rest },
  ref,
) {
  const inputId = id || rest.name || undefined;
  const showError = Boolean(error);
  const baseInput = inputClass({ error: showError, extra: className || '' });
  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className={LABEL_BASE}>
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500 pointer-events-none">
            {prefix}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          {...rest}
          className={cn(baseInput, prefix ? 'pl-9' : '', suffix ? 'pr-9' : '')}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-gray-500">
            {suffix}
          </div>
        )}
      </div>
      {showError ? (
        <p className={ERROR_BASE}>{error}</p>
      ) : hint ? (
        <p className={HINT_BASE}>{hint}</p>
      ) : null}
    </div>
  );
});
