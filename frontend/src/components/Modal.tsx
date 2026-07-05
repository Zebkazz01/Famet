import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Don't show the X button */
  hideClose?: boolean;
  /** Extra class on the backdrop */
  className?: string;
}

export function Modal({ open, onClose, children, hideClose, className }: ModalProps) {
  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 ${className || ''}`}
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        {!hideClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
