import { useCallback, type Dispatch, type SetStateAction } from "react";

type CheckboxState = boolean | "indeterminate";

export const useVisibleSelection = (
  visibleIds: string[],
  setSelectedIds: Dispatch<SetStateAction<string[]>>,
) => {
  const setSelected = useCallback(
    (id: string, checked: CheckboxState) => {
      setSelectedIds(current => {
        const next = new Set(current);
        if (checked === true) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return Array.from(next);
      });
    },
    [setSelectedIds],
  );

  const toggleVisibleSelection = useCallback(
    (checked: CheckboxState) => {
      setSelectedIds(current => {
        const next = new Set(current);
        for (const id of visibleIds) {
          if (checked === true) {
            next.add(id);
          } else {
            next.delete(id);
          }
        }
        return Array.from(next);
      });
    },
    [setSelectedIds, visibleIds],
  );

  return {
    setSelected,
    toggleVisibleSelection,
  };
};
