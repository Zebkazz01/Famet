import { ArrowsClockwise, X } from '@phosphor-icons/react';
import { Button } from './ui';

export interface UpdateAvailableToastProps {
  onUpdate: () => void;
  onDismiss: () => void;
  message?: string;
}

export function UpdateAvailableToast({ onUpdate, onDismiss, message }: UpdateAvailableToastProps) {
  return (
    <div className="flex items-start gap-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded-xl shadow-lg p-4 max-w-md">
      <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
        <ArrowsClockwise size={22} weight="duotone" className="text-red-500 dark:text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nueva versión disponible</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          {message || 'El logo o la configuración han cambiado. Actualiza para ver los cambios.'}
        </p>
        <div className="flex gap-2 mt-2.5">
          <Button size="sm" variant="primary" onClick={onUpdate}>
            Actualizar ahora
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Después
          </Button>
        </div>
      </div>
      <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}
