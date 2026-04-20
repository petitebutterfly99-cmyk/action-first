import { useEffect, useState } from "react";
import { activityStore, ActivityEntry } from "@/data/activityStore";

export function useActivityLog(): ActivityEntry[] {
  const [entries, setEntries] = useState<ActivityEntry[]>(() => activityStore.list());
  useEffect(() => activityStore.subscribe(setEntries), []);
  return entries;
}
