import { useState, type ReactNode } from 'react';
import { Info, X } from '@phosphor-icons/react';

interface PageHeaderProps {
  icon: ReactNode;
  iconColorClass?: string;
  title: string;
  subtitle?: ReactNode;
  description: string;
  actions?: ReactNode;
}

/**
 * Cabecera estándar de página: icono + título + leyenda informativa + acciones.
 * En móvil la leyenda se oculta y aparece bajo demanda con un icono de info,
 * para que el bloque no ocupe demasiado vertical y los botones de acción se
 * vean correctamente al lado del título.
 */
export function PageHeader({
  icon,
  iconColorClass = 'text-red-500',
  title,
  subtitle,
  description,
  actions,
}: PageHeaderProps) {
  const [showDescription, setShowDescription] = useState(false);

  return (
    <div className="mt-2 md:mt-0 mb-4 md:mb-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
          <span className={`${iconColorClass} flex-shrink-0`}>{icon}</span>
          <span className="truncate">{title}</span>
          {subtitle}
          {description && (
            <button
              type="button"
              onClick={() => setShowDescription((v) => !v)}
              title={showDescription ? 'Ocultar descripción' : 'Ver descripción del módulo'}
              className="md:hidden flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              {showDescription ? <X size={14} weight="bold" /> : <Info size={16} weight="duotone" />}
            </button>
          )}
        </h1>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {description && (
        <p
          className={`text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed ${
            showDescription ? '' : 'hidden md:block'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
