/** Tokens compartidos del design system (Tailwind v4 + dark mode + tema rojo). */

export const INPUT_BASE =
  'w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors';

export const INPUT_BORDER = 'border-gray-300 dark:border-gray-700';

export const INPUT_FOCUS =
  'focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500';

export const INPUT_DISABLED =
  'disabled:bg-gray-100 dark:disabled:bg-slate-900 disabled:text-gray-400 disabled:cursor-not-allowed';

export const INPUT_ERROR_BORDER = 'border-red-500 dark:border-red-500 focus:ring-red-400/30';

export const LABEL_BASE =
  'block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300';

export const HINT_BASE = 'text-[11px] text-gray-500 dark:text-gray-400 mt-1';

export const ERROR_BASE = 'text-[11px] text-red-500 dark:text-red-400 mt-1';

export function cn(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(' ');
}

export function inputClass(opts: { error?: boolean; extra?: string } = {}): string {
  return cn(
    INPUT_BASE,
    opts.error ? INPUT_ERROR_BORDER : INPUT_BORDER,
    INPUT_FOCUS,
    INPUT_DISABLED,
    opts.extra,
  );
}
