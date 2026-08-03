import { useEffect, useCallback } from 'react';

/**
 * Global keyboard shortcut hook:
 * - Ctrl+Shift+F: toggles filter panel visibility
 * - When filters are visible, TAB cycles through filter elements
 */
export function useFilterShortcut(
  filtersVisible: boolean,
  setFiltersVisible: (v: boolean | ((prev: boolean) => boolean)) => void,
  filterContainerRef?: React.RefObject<HTMLElement | null>,
) {
  const focusNextFilter = useCallback(() => {
    if (!filterContainerRef?.current) return;
    const focusable = filterContainerRef.current.querySelectorAll<HTMLElement>(
      'input, select, button, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const active = document.activeElement;
    const idx = Array.from(focusable).indexOf(active as HTMLElement);
    const next = idx >= 0 ? (idx + 1) % focusable.length : 0;
    focusable[next].focus();
  }, [filterContainerRef]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+Shift+F → toggle filters
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setFiltersVisible((prev) => !prev);
        return;
      }

      // Tab when filters are visible → cycle through filter elements
      if (e.key === 'Tab' && filtersVisible && filterContainerRef?.current) {
        const focusable = filterContainerRef.current.querySelectorAll<HTMLElement>(
          'input, select, button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const active = document.activeElement;
        const isInFilters = filterContainerRef.current.contains(active);
        if (!isInFilters) return;

        e.preventDefault();
        const idx = Array.from(focusable).indexOf(active as HTMLElement);
        const next = e.shiftKey
          ? (idx - 1 + focusable.length) % focusable.length
          : (idx + 1) % focusable.length;
        focusable[next].focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filtersVisible, setFiltersVisible, filterContainerRef, focusNextFilter]);
}
