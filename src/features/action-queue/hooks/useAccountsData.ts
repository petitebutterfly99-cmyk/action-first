import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Account,
  bulkUpdateAccountsInDb,
  fetchAccounts,
  updateAccountInDb,
} from "@/shared/data/accounts";

/**
 * Owns the list of accounts visible to the current CSM plus the primitives
 * used to mutate them locally and persist through to the database.
 *
 * - `loadQueue` (re-)fetches from Supabase. Returns a cancel function.
 * - `updateAccount` patches a single row in state and writes through to DB.
 * - `bulkUpdateAccounts` patches many rows at once with grouped DB writes.
 * - `resetHandledItems` flips every account back to `needs_action` (local-only).
 */
export function useAccountsData() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadQueue = () => {
    setIsLoading(true);
    setLoadError(null);
    let cancelled = false;
    fetchAccounts()
      .then((rows) => {
        if (cancelled) return;
        setAccounts(rows);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("We ran into a problem loading this queue.");
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

  /**
   * Apply a per-row updater to every selected id. We collect the resulting
   * patches, group identical ones, and fire one bulk DB write per group so
   * we don't hammer the API with N separate updates.
   */
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
