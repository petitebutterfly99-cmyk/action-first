import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Account, AccountStatus, RiskLevel } from "@/shared/data/accounts";

/**
 * Reads `?focus=<accountId>` and `?reset=1` from the URL and translates them
 * into queue side-effects:
 *
 * - `?reset` widens the filters back to defaults so any account is visible.
 * - `?focus` widens filters as needed, asks the infinite-scroll list to render
 *   the row, then scrolls + highlights it briefly.
 *
 * Both params are stripped from the URL once handled so the effect doesn't
 * re-fire on subsequent renders.
 */
export function useFocusFromUrl(opts: {
  isLoading: boolean;
  loadError: unknown;
  accounts: Account[];
  sortedAccounts: Account[];
  riskFilter: RiskLevel[];
  setRiskFilter: (next: RiskLevel[]) => void;
  statusFilter: "all" | AccountStatus;
  setStatusFilter: (next: "all" | AccountStatus) => void;
  cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  revealAtLeast: (n: number) => void;
}) {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Re-extract the params each render so the effect dep array is stable.
  const focusParam = searchParams.get("focus");
  const resetParam = searchParams.get("reset");

  // Avoid stale-closure references in the effect.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const o = optsRef.current;
    if (o.isLoading || o.loadError) return;

    if (resetParam) {
      o.setRiskFilter(["high", "medium", "low"]);
      o.setStatusFilter("all");
      const next = new URLSearchParams(searchParams);
      next.delete("reset");
      setSearchParams(next, { replace: true });
      return;
    }

    if (!focusParam) return;

    const target = o.accounts.find((a) => a.id === focusParam);
    if (!target) {
      toast({
        title: "Not in Action Queue",
        description: "This account is not currently in the Action Queue.",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("focus");
      setSearchParams(next, { replace: true });
      return;
    }
    if (!o.riskFilter.includes(target.risk)) {
      o.setRiskFilter(Array.from(new Set([...o.riskFilter, target.risk])) as RiskLevel[]);
    }
    if (o.statusFilter !== "all" && o.statusFilter !== target.status) {
      o.setStatusFilter("all");
    }
    setHighlightId(focusParam);
    const idx = o.sortedAccounts.findIndex((a) => a.id === focusParam);
    if (idx >= 0) o.revealAtLeast(idx + 1);
    requestAnimationFrame(() => {
      const el = o.cardRefs.current[focusParam];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const t = setTimeout(() => setHighlightId(null), 2400);
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
    return () => clearTimeout(t);
    // We depend only on the params + readiness — opts come through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusParam, resetParam, opts.isLoading, opts.loadError]);

  return { highlightId };
}
