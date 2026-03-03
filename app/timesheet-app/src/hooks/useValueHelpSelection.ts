import { useState, useCallback } from 'react';

interface UseValueHelpSelectionOptions<T> {
  initialSelection?: T[];
  idKey: keyof T;
}

/**
 * Manages selection state for Value Help dialogs
 */
export function useValueHelpSelection<T>(options: UseValueHelpSelectionOptions<T>) {
  const { initialSelection = [], idKey } = options;
  const [selection, setSelection] = useState<T[]>(initialSelection);

  const selectedIds = new Set(selection.map((item) => item[idKey] as string | number));

  const isSelected = useCallback(
    (item: T) => selectedIds.has(item[idKey] as string | number),
    [selectedIds, idKey]
  );

  const toggle = useCallback(
    (item: T) => {
      setSelection((prev) => {
        const id = item[idKey];
        const exists = prev.some((i) => i[idKey] === id);
        if (exists) {
          return prev.filter((i) => i[idKey] !== id);
        }
        return [...prev, item];
      });
    },
    [idKey]
  );

  const selectAll = useCallback((items: T[]) => {
    setSelection(items);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection([]);
  }, []);

  return {
    selection,
    selectedIds,
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    setSelection,
  };
}