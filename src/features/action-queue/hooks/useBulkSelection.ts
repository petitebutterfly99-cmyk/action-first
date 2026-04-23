import { useState } from "react";

/** Selected-id set + follow-up date map for bulk operations on the queue. */
export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [followUpDates, setFollowUpDates] = useState<Record<string, Date>>({});

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const removeFromSelection = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  const setFollowUpForIds = (ids: string[], date: Date) =>
    setFollowUpDates((prev) => {
      const next = { ...prev };
      ids.forEach((id) => (next[id] = date));
      return next;
    });

  return {
    selectedIds,
    setSelectedIds,
    toggleSelected,
    clearSelection,
    removeFromSelection,
    followUpDates,
    setFollowUpDates,
    setFollowUpForIds,
  };
}
