import { WarningCircle, Trash, Info, Check, X } from '@phosphor-icons/react';
import { Portal } from './Portal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const variants = {
  danger: {
    icon: Trash,
    confirmIcon: Trash,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    btnClass: 'bg-red-500 hover:bg-red-600 text-white',
  },
  warning: {
    icon: WarningCircle,
    confirmIcon: Check,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    icon: Info,
    confirmIcon: Check,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
};

export function ConfirmModal({
  open, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar',
  variant = 'warning', onConfirm, onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const v = variants[variant];
  const Icon = v.icon;
  const ConfirmIcon = v.confirmIcon;

  return (
    <Portal><div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in relative">
        <button onClick={onCancel}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors z-10">
          <X size={16} weight="bold" />
        </button>
        <div className="p-6 text-center">
          <div className={`w-14 h-14 ${v.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon size={28} weight="duotone" className={v.iconColor} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <X size={16} weight="bold" />
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${v.btnClass}`}
          >
            <ConfirmIcon size={16} weight="bold" />
            {confirmText}
          </button>
        </div>
      </div>
    </div></Portal>
  );
}
