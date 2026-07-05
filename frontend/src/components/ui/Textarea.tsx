import { forwardRef, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { LABEL_BASE, HINT_BASE, ERROR_BASE, cn, inputClass } from './tokens';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, wrapperClassName, className, id, rows = 3, ...rest },
  ref,
) {
  const tId = id || rest.name || undefined;
  const showError = Boolean(error);
  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <label htmlFor={tId} className={LABEL_BASE}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={tId}
        rows={rows}
        {...rest}
        className={cn(inputClass({ error: showError }), 'resize-y', className)}
      />
      {showError ? <p className={ERROR_BASE}>{error}</p> : hint ? <p className={HINT_BASE}>{hint}</p> : null}
    </div>
  );
});
