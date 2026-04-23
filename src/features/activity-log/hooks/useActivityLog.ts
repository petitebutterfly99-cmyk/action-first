import { useEffect, useState } from "react";
import { activityStore, ActivityEntry } from "../api/activityStore";

/** Subscribes to the activity store; returns the current list of entries. */
export function useActivityLog(): ActivityEntry[] {
  const [entries, setEntries] = useState<ActivityEntry[]>(() => activityStore.list());
  useEffect(() => {
    const unsub = activityStore.subscribe(setEntries);
    return () => {
      unsub();
    };
  }, []);
  return entries;
}
