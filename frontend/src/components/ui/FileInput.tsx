import { type ChangeEvent, type ReactNode, useRef, useState, useEffect } from 'react';
import { UploadSimple, X, File as FileIcon, Image as ImageIcon } from '@phosphor-icons/react';
import { LABEL_BASE, HINT_BASE, ERROR_BASE, cn } from './tokens';

export interface FileInputProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  accept?: string;
  maxSizeMB?: number;
  /** Vista previa para imágenes. Default: true */
  preview?: boolean;
  value?: File | null;
  onChange?: (file: File | null) => void;
  wrapperClassName?: string;
  disabled?: boolean;
  /** URL existente (para mostrar archivo ya subido). */
  existingUrl?: string | null;
}

export function FileInput({
  label,
  hint,
  error,
  accept,
  maxSizeMB = 10,
  preview = true,
  value,
  onChange,
  wrapperClassName,
  disabled,
  existingUrl,
}: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    if (!preview || !value.type.startsWith('image/')) return;
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value, preview]);

  function pick(file: File | null) {
    setLocalError(null);
    if (file && maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`Archivo supera ${maxSizeMB} MB`);
      return;
    }
    onChange?.(file);
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    pick(f);
  }

  function clear() {
    onChange?.(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const showError = Boolean(error) || Boolean(localError);
  const isImage = value?.type.startsWith('image/') || (existingUrl && /\.(png|jpe?g|gif|webp|svg)$/i.test(existingUrl));

  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && <label className={LABEL_BASE}>{label}</label>}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (disabled) return;
          const f = e.dataTransfer.files?.[0] || null;
          pick(f);
        }}
        className={cn(
          'rounded-lg border-2 border-dashed transition-colors p-4 text-center cursor-pointer',
          drag
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
            : showError
              ? 'border-red-300 dark:border-red-700'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onFileChange}
          disabled={disabled}
        />
        {value ? (
          <div className="flex items-center gap-3 text-left">
            {previewUrl && isImage ? (
              <img src={previewUrl} alt={value.name} className="w-12 h-12 object-cover rounded-lg" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                {value.type === 'application/pdf' ? (
                  <FileIcon size={24} weight="duotone" className="text-red-500" />
                ) : (
                  <ImageIcon size={24} weight="duotone" className="text-blue-500" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{value.name}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{(value.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <X size={14} />
            </button>
          </div>
        ) : existingUrl ? (
          <div className="flex items-center gap-3 text-left">
            {isImage ? (
              <img src={existingUrl} alt="actual" className="w-12 h-12 object-cover rounded-lg" />
            ) : (
              <FileIcon size={32} weight="duotone" className="text-gray-400" />
            )}
            <div className="flex-1 text-xs text-gray-600 dark:text-gray-400">
              Archivo actual cargado. Click para reemplazar.
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-2 text-gray-500 dark:text-gray-400">
            <UploadSimple size={22} weight="duotone" />
            <p className="text-xs font-medium">Arrastra o haz click para subir</p>
            {hint && <p className="text-[10px]">{hint}</p>}
          </div>
        )}
      </div>
      {showError ? (
        <p className={ERROR_BASE}>{error || localError}</p>
      ) : hint && !value ? null : hint ? (
        <p className={HINT_BASE}>{hint}</p>
      ) : null}
    </div>
  );
}
