import { Calendar, Warning, CheckCircle, Clock } from '@phosphor-icons/react';
import { getExpiryStatus, formatExpiry } from '../../utils/expiryHelpers';
import { cn } from '../ui/tokens';

export interface ExpiryBadgeProps {
  date?: string | Date | null;
  size?: 'xs' | 'sm' | 'md';
  showDate?: boolean;
  className?: string;
}

const SIZES = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-0.5',
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
} as const;

const ICON_SIZE = { xs: 10, sm: 11, md: 13 } as const;

export function ExpiryBadge({ date, size = 'sm', showDate = false, className }: ExpiryBadgeProps) {
  const status = getExpiryStatus(date);
  if (status.level === 'none') return null;
  const Icon =
    status.level === 'expired' ? Warning :
    status.level === 'critical' ? Warning :
    status.level === 'warning' ? Clock :
    status.level === 'caution' ? Calendar :
    CheckCircle;
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full leading-none',
        status.badgeBg,
        status.badgeText,
        SIZES[size],
        className,
      )}
      title={showDate ? undefined : formatExpiry(date)}
    >
      <Icon size={ICON_SIZE[size]} weight="duotone" />
      {status.label}
      {showDate && <span className="opacity-70 ml-1">· {formatExpiry(date)}</span>}
    </span>
  );
}
