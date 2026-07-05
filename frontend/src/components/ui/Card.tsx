import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './tokens';

type Padding = 'none' | 'sm' | 'md' | 'lg';

const PAD: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  bordered?: boolean;
  hover?: boolean;
}

export function Card({ padding = 'md', bordered = true, hover = false, className, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl shadow-sm',
        bordered && 'border border-gray-200 dark:border-gray-700',
        hover && 'hover:shadow-md transition-shadow',
        PAD[padding],
        className,
      )}
    />
  );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('px-4 py-3 border-b border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50 rounded-b-xl', className)}>
      {children}
    </div>
  );
}
