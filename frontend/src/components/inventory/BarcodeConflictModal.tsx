import { Portal } from '../Portal';
import { Warning, Package, ArrowRight, Plus, X, Tag } from '@phosphor-icons/react';
import { Button, Badge } from '../ui';
import type { ResolvedBarcode } from '../../api/barcodes';
import { useModalEscape } from '../../contexts/ModalStackContext';

export interface BarcodeConflictModalProps {
  open: boolean;
  resolved: ResolvedBarcode | null;
  onClose: () => void;
  /** Asociar el código al producto sugerido (activo actual). */
  onAssignToSuggested: () => void;
  /** Continuar con el producto exacto (mismo barcode aún apunta a este producto). */
  onUseExact: () => void;
  /** Crear nuevo producto desde el código. */
  onCreateNew: () => void;
}

export function BarcodeConflictModal({
  open, resolved, onClose, onAssignToSuggested, onUseExact, onCreateNew,
}: BarcodeConflictModalProps) {
  useModalEscape(onClose);
  if (!open || !resolved) return null;

  const { code, category, exactProduct, suggestedProduct, knownAliases } = resolved;
  const hasExact = !!exactProduct;
  const hasSuggested = !!suggestedProduct && suggestedProduct.id !== exactProduct?.id;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="bg-amber-500 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Warning size={22} weight="duotone" className="text-white" />
              <div>
                <h3 className="text-white font-bold text-lg">Código de barras conocido</h3>
                <p className="text-amber-50 text-xs">¿Es el mismo producto?</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
              <X size={18} weight="bold" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg p-3 flex items-center gap-3">
              <Tag size={18} weight="duotone" className="text-gray-500" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Código escaneado</p>
                <p className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100">{code}</p>
              </div>
              {category && (
                <Badge variant="blue" size="sm">{category.name}</Badge>
              )}
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300">
              Este código fue usado antes para la categoría <span className="font-semibold">{category?.name || 'desconocida'}</span>.
              Elige cómo proceder:
            </p>

            <div className="space-y-2">
              {hasExact && (
                <button
                  onClick={onUseExact}
                  className="w-full text-left p-3 border border-blue-200 dark:border-blue-900/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-3"
                >
                  <Package size={20} weight="duotone" className="text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Usar este producto: {exactProduct.name}
                    </p>
                    <p className="text-[11px] text-gray-500">Stock actual: {exactProduct.stockQty}</p>
                  </div>
                  <ArrowRight size={16} className="text-blue-600" />
                </button>
              )}

              {hasSuggested && (
                <button
                  onClick={onAssignToSuggested}
                  className="w-full text-left p-3 border border-green-200 dark:border-green-900/50 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-3"
                >
                  <Package size={20} weight="duotone" className="text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Asociar al producto activo: {suggestedProduct.name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Stock: {suggestedProduct.stockQty} · Proveedor: {suggestedProduct.supplier?.name || '—'}
                    </p>
                    <p className="text-[10px] text-green-700 dark:text-green-400 mt-0.5">
                      Mismo producto, distinto proveedor/lote — heredará el código nuevo
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-green-600" />
                </button>
              )}

              <button
                onClick={onCreateNew}
                className="w-full text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
              >
                <Plus size={20} weight="bold" className="text-gray-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Crear nuevo producto
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Si es algo distinto (no es el mismo tipo de producto)
                  </p>
                </div>
                <ArrowRight size={16} className="text-gray-500" />
              </button>
            </div>

            {knownAliases.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  Otros códigos de esta categoría ({knownAliases.length})
                </summary>
                <ul className="mt-2 space-y-1 max-h-32 overflow-auto styled-scroll">
                  {knownAliases.map((a) => (
                    <li key={a.id} className="text-[11px] flex items-center justify-between bg-gray-50 dark:bg-slate-700/40 px-2 py-1 rounded-lg">
                      <span className="font-mono">{a.barcode}</span>
                      <span className="text-gray-400">visto {a.timesSeen}x</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
