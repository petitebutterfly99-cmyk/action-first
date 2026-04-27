import { useEffect, useState } from "react";
import { activityStore, ActivityEntry } from "../api/activityStore";

export interface UseActivityLogResult {
  entries: ActivityEntry[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Subscribes to the activity store; exposes loading + error so the page can
 * skeleton on first hydrate and show a retry card when the cloud read fails.
 */
export function useActivityLog(): UseActivityLogResult {
  const [entries, setEntries] = useState<ActivityEntry[]>(() => activityStore.list());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setLoading(true);
    setError(null);
    activityStore
      .hydrate()
      .catch((e: unknown) => {
        setError(
          e instanceof Error ? e.message : "We couldn't load your activity log.",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const unsub = activityStore.subscribe(setEntries);
    run();
    return () => {
      unsub();
    };
  }, []);

  return { entries, loading, error, reload: run };
}
