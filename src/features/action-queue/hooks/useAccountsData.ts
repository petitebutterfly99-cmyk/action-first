import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Account,
  bulkUpdateAccountsInDb,
  fetchAccounts,
  updateAccountInDb,
} from "@/shared/data/accounts";

/**
 * Categorized error kinds so the UI can show a precise message
 * (timeout vs offline vs server error vs unknown).
 */
export type LoadErrorKind = "timeout" | "offline" | "server" | "unknown";
export interface LoadError {
  kind: LoadErrorKind;
  title: string;
  message: string;
}

const FETCH_TIMEOUT_MS = 10_000;

function classifyError(e: unknown): LoadError {
  // Offline (browser reports no network)
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      kind: "offline",
      title: "You're offline",
      message: "Check your internet connection and try again.",
    };
  }
  const msg = e instanceof Error ? e.message : String(e ?? "");
  if (/timeout|timed out/i.test(msg)) {
    return {
      kind: "timeout",
      title: "Service Temporarily Unavailable",
      message:
        "The database took too long to respond. This is usually temporary — please retry in a moment.",
    };
  }
  if (/failed to fetch|networkerror|network error|fetch/i.test(msg)) {
    return {
      kind: "server",
      title: "Service Temporarily Unavailable",
      message: "We couldn't reach the database. Please retry in a moment.",
    };
  }
  return {
    kind: "unknown",
    title: "Couldn't load accounts",
    message: "We ran into a problem loading this queue.",
  };
}

/** Race a promise against a timeout. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timed out")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Owns the list of accounts visible to the current CSM plus the primitives
 * used to mutate them locally and persist through to the database.
 */
export function useAccountsData() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError | null>(null);

  const loadQueue = () => {
    setIsLoading(true);
    setLoadError(null);
    let cancelled = false;

    // Dev-only: ?simulateTimeout=1 forces a timeout so we can verify the
    // error state without breaking real connectivity.
    const simulateTimeout =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("simulateTimeout") === "1";

    const request: Promise<Account[]> = simulateTimeout
      ? new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 1500),
        )
      : withTimeout(fetchAccounts(), FETCH_TIMEOUT_MS);

    request
      .then((rows) => {
        if (cancelled) return;
        setAccounts(rows);
        setIsLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(classifyError(e));
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    return loadQueue();
  }, []);

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    updateAccountInDb(id, updates).catch(() => {
      toast({
        title: "Couldn't sync change",
        description: "This update didn't save to the server.",
        variant: "destructive",
      });
    });
  };

  const bulkUpdateAccounts = (
    selectedIds: Set<string>,
    updater: (a: Account) => Partial<Account> | null,
  ) => {
    const updatesById = new Map<string, Partial<Account>>();
    setAccounts((prev) =>
      prev.map((a) => {
        if (!selectedIds.has(a.id)) return a;
        const u = updater(a);
        if (!u) return a;
        updatesById.set(a.id, u);
        return { ...a, ...u };
      }),
    );
    const groups = new Map<string, { ids: string[]; updates: Partial<Account> }>();
    updatesById.forEach((updates, id) => {
      const key = JSON.stringify(updates);
      const existing = groups.get(key);
      if (existing) existing.ids.push(id);
      else groups.set(key, { ids: [id], updates });
    });
    groups.forEach(({ ids, updates }) => {
      bulkUpdateAccountsInDb(ids, updates).catch(() => {
        toast({
          title: "Couldn't sync changes",
          description: "Some account updates didn't save to the server.",
          variant: "destructive",
        });
      });
    });
  };

  const resetHandledItems = () => {
    setAccounts((prev) => prev.map((a) => ({ ...a, status: "needs_action" })));
    toast({
      title: "Handled items reset",
      description: "All accounts moved back to Needs Action.",
    });
  };

  return {
    accounts,
    setAccounts,
    isLoading,
    loadError,
    loadQueue,
    updateAccount,
    bulkUpdateAccounts,
    resetHandledItems,
  };
}
