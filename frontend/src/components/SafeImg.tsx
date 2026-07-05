import { useState, type ImgHTMLAttributes } from 'react';
import { ImageBroken, Package } from '@phosphor-icons/react';

interface SafeImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Icono fallback. Default: Package */
  fallbackIcon?: 'package' | 'broken';
  /** Tamaño del icono fallback (px) */
  iconSize?: number;
  /** className adicional al wrapper cuando se muestra placeholder */
  placeholderClassName?: string;
}

/**
 * Imagen con fallback grafico cuando falla la carga. NO muestra el texto alt.
 * Reemplazo directo del <img>. Mantiene mismo tamano via className.
 */
export function SafeImg({
  src,
  alt,
  className,
  fallbackIcon = 'package',
  iconSize,
  placeholderClassName,
  onError,
  ...rest
}: SafeImgProps) {
  const [broken, setBroken] = useState(!src);

  if (broken || !src) {
    const Icon = fallbackIcon === 'broken' ? ImageBroken : Package;
    return (
      <div
        className={`${className || ''} ${placeholderClassName || ''} bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500`.trim()}
        title={alt || ''}
        role="img"
        aria-label={alt}
      >
        <Icon size={iconSize || 24} weight="duotone" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => { setBroken(true); onError?.(e); }}
      {...rest}
    />
  );
}
