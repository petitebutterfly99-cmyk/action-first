import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, MessageCircle, CheckCircle, X, RefreshCw, AlertCircle, CheckCheck, Inbox, FilterX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { AppLayout } from "@/components/AppLayout";
import { AccountCard } from "@/components/AccountCard";
import { AccountDetailPanel } from "@/components/AccountDetailPanel";
import { OutreachModal } from "@/components/OutreachModal";
import { OutcomeModal, OutreachOutcome } from "@/components/OutcomeModal";
import { PromptInviteModal } from "@/components/PromptInviteModal";
import { NextBestAccountModal } from "@/components/NextBestAccountModal";
import { SnoozeModal, SnoozeData } from "@/components/SnoozeModal";
import { mockAccounts, Account, AccountStatus, RiskLevel } from "@/data/mockAccounts";
import { activityStore } from "@/data/activityStore";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_FILTER_OPTIONS: { value: "all" | AccountStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "contacted", label: "Contacted" },
  { value: "reviewed", label: "Reviewed" },
  { value: "snoozed", label: "Snoozed" },
  { value: "follow_up_needed", label: "Follow-up Needed" },
];

const RISK_OPTIONS: { value: RiskLevel; label: string; dotClass: string; activeClass: string }[] = [
  {
    value: "high",
    label: "High Risk",
    dotClass: "bg-[hsl(var(--risk-high))]",
    activeClass:
      "data-[state=on]:bg-[hsl(var(--badge-urgent-bg))] data-[state=on]:text-[hsl(var(--badge-urgent-fg))] data-[state=on]:border-[hsl(var(--risk-high))]",
  },
  {
    value: "medium",
    label: "Medium Risk",
    dotClass: "bg-[hsl(var(--risk-medium))]",
    activeClass:
      "data-[state=on]:bg-[hsl(var(--badge-warning-bg))] data-[state=on]:text-[hsl(var(--badge-warning-fg))] data-[state=on]:border-[hsl(var(--risk-medium))]",
  },
  {
    value: "low",
    label: "Healthy",
    dotClass: "bg-[hsl(var(--risk-low))]",
    activeClass:
      "data-[state=on]:bg-[hsl(var(--badge-success-bg))] data-[state=on]:text-[hsl(var(--badge-success-fg))] data-[state=on]:border-[hsl(var(--risk-low))]",
  },
];

/**
 * Wrap an action so we always log to the activity store. Performs the action
 * first; only writes the log if the action succeeds. If the log write fails,
 * we surface a non-blocking warning toast with a "Retry log update" action.
 * On successful retry, the warning is dismissed automatically.
 */
function safeLog(
  toast: ReturnType<typeof useToast>["toast"],
  action: () => void,
  entry: Parameters<typeof activityStore.log>[0],
) {
  // 1. Perform the user-facing action. If it fails, do not log.
  action();

  // 2. Attempt log write. The store only commits on persist success, so a
  //    failure here means no Activity Log entry exists yet.
  const tryWrite = (): boolean => {
    try {
      activityStore.log(entry);
      return true;
    } catch {
      return false;
    }
  };

  if (tryWrite()) return;

  // 3. Show a non-blocking warning with a retry affordance.
  const t = toast({
    title: "Heads up",
    description: "Action completed, but Activity Log could not be updated.",
    variant: "destructive",
    duration: 10000,
    action: (
      <ToastAction
        altText="Retry log update"
        onClick={(e) => {
          e.preventDefault();
          if (tryWrite()) {
            t.dismiss();
            toast({ title: "Activity Log updated", duration: 2500 });
          }
        }}
      >
        Retry log update
      </ToastAction>
    ),
  });
}


export default function ActionQueuePage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [outreachAccount, setOutreachAccount] = useState<Account | null>(null);
  const [outcomeAccount, setOutcomeAccount] = useState<Account | null>(null);
  const [promptAccount, setPromptAccount] = useState<Account | null>(null);
  const [nextBestAccount, setNextBestAccount] = useState<Account | null>(null);
  const [nextBestMode, setNextBestMode] = useState<"ready" | "loading" | "done" | "error">("ready");
  const [nextBestStillSearching, setNextBestStillSearching] = useState(false);
  const [nextBestOpen, setNextBestOpen] = useState(false);
  const lastHandledIdRef = useRef<string | null>(null);
  const stillSearchingTimer = useRef<number | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel[]>(["high", "medium", "low"]);
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");
  const [outcomes, setOutcomes] = useState<Record<string, OutreachOutcome>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [followUpDates, setFollowUpDates] = useState<Record<string, Date>>({});
  const [bulkFollowUpOpen, setBulkFollowUpOpen] = useState(false);
  const [snoozeAccount, setSnoozeAccount] = useState<Account | null>(null);
  const [snoozes, setSnoozes] = useState<Record<string, SnoozeData>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Simulated load — keeps loading + failure paths real for UX states.
  const loadQueue = () => {
    setIsLoading(true);
    setLoadError(null);
    const t = setTimeout(() => {
      try {
        setAccounts(mockAccounts);
        setIsLoading(false);
      } catch {
        setLoadError("We ran into a problem loading this queue.");
        setIsLoading(false);
      }
    }, 450);
    return () => clearTimeout(t);
  };

  useEffect(() => {
    return loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetHandledItems = () => {
    setAccounts((prev) => prev.map((a) => ({ ...a, status: "needs_action" as AccountStatus })));
    setSnoozes({});
    setFollowUpDates({});
    toast({ title: "Handled items reset", description: "All accounts moved back to Needs Action." });
  };

  const resetFilters = () => {
    setRiskFilter(["high", "medium", "low"]);
    setStatusFilter("all");
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const applyBulk = (updater: (a: Account) => Partial<Account> | null) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (!selectedIds.has(a.id)) return a;
        const u = updater(a);
        return u ? { ...a, ...u } : a;
      }),
    );
  };

  const handleBulkSendOutreach = () => {
    const ids = Array.from(selectedIds);
    const targets = accounts.filter((a) => ids.includes(a.id));
    safeLog(
      toast,
      () => applyBulk(() => ({ status: "contacted" as AccountStatus })),
      {
        action: `Sent outreach to ${ids.length} accounts`,
        type: "send_outreach",
        account: targets.map((t) => t.name).join(", "),
      },
    );
    toast({ title: "Outreach sent", description: `Sent to ${ids.length} account${ids.length > 1 ? "s" : ""}.` });
    clearSelection();
  };

  const handleBulkMarkReviewed = () => {
    const ids = Array.from(selectedIds);
    const targets = accounts.filter((a) => ids.includes(a.id));
    safeLog(
      toast,
      () => applyBulk(() => ({ status: "reviewed" as AccountStatus })),
      {
        action: `Marked ${ids.length} accounts as reviewed`,
        type: "mark_reviewed",
        account: targets.map((t) => t.name).join(", "),
      },
    );
    toast({ title: "Marked as reviewed", description: `${ids.length} account${ids.length > 1 ? "s" : ""} marked as reviewed.` });
    clearSelection();
  };

  const handleBulkAssignFollowUp = (date: Date | undefined) => {
    if (!date) return;
    const ids = Array.from(selectedIds);
    const targets = accounts.filter((a) => ids.includes(a.id));
    setFollowUpDates((prev) => {
      const next = { ...prev };
      ids.forEach((id) => (next[id] = date));
      return next;
    });
    safeLog(
      toast,
      () =>
        setAccounts((prev) =>
          prev.map((a) => (ids.includes(a.id) ? { ...a, status: "follow_up_needed" as AccountStatus } : a)),
        ),
      {
        action: `Assigned follow-up to ${ids.length} accounts for ${format(date, "PPP")}`,
        type: "save_outcome",
        account: targets.map((t) => t.name).join(", "),
      },
    );
    setBulkFollowUpOpen(false);
    toast({
      title: "Follow-up assigned",
      description: `${ids.length} account${ids.length > 1 ? "s" : ""} scheduled for ${format(date, "PPP")}.`,
    });
    clearSelection();
  };

  const riskCounts = useMemo(
    () => ({
      high: accounts.filter((a) => a.risk === "high").length,
      medium: accounts.filter((a) => a.risk === "medium").length,
      low: accounts.filter((a) => a.risk === "low").length,
    }),
    [accounts],
  );

  const sortedAccounts = useMemo(() => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    const statusOrder: Record<AccountStatus, number> = {
      needs_action: 0,
      follow_up_needed: 1,
      contacted: 2,
      reviewed: 3,
      snoozed: 4,
    };
    return [...accounts]
      .filter((a) => riskFilter.includes(a.risk))
      .filter((a) => statusFilter === "all" || a.status === statusFilter)
      .sort((a, b) => {
        const sd = statusOrder[a.status] - statusOrder[b.status];
        if (sd !== 0) return sd;
        return riskOrder[a.risk] - riskOrder[b.risk];
      });
  }, [accounts, riskFilter, statusFilter]);

  const snoozedCount = accounts.filter((a) => a.status === "snoozed").length;
  const needsActionCount = accounts.filter((a) => a.status === "needs_action" && a.risk !== "low").length;

  // Counts per Queue Status, scoped to currently selected risk filter so the
  // dropdown reflects what users will actually see when they pick a status.
  const statusCounts = useMemo(() => {
    const inRisk = accounts.filter((a) => riskFilter.includes(a.risk));
    return {
      all: inRisk.length,
      contacted: inRisk.filter((a) => a.status === "contacted").length,
      reviewed: inRisk.filter((a) => a.status === "reviewed").length,
      snoozed: inRisk.filter((a) => a.status === "snoozed").length,
      follow_up_needed: inRisk.filter((a) => a.status === "follow_up_needed").length,
      needs_action: inRisk.filter((a) => a.status === "needs_action").length,
    };
  }, [accounts, riskFilter]);

  const RISK_LABEL: Record<RiskLevel, string> = { high: "High Risk", medium: "Medium Risk", low: "Healthy" };
  const STATUS_LABEL: Record<"all" | AccountStatus, string> = {
    all: "All",
    contacted: "Contacted",
    reviewed: "Reviewed",
    snoozed: "Snoozed",
    follow_up_needed: "Follow-up Needed",
    needs_action: "Needs Action",
  };

  const isDefaultFilters =
    riskFilter.length === 3 && statusFilter === "all";

  const clearFilters = () => {
    setRiskFilter(["high", "medium", "low"]);
    setStatusFilter("all");
  };

  const removeRiskChip = (r: RiskLevel) => {
    const next = riskFilter.filter((x) => x !== r);
    if (next.length === 0) setRiskFilter(["high", "medium", "low"]);
    else setRiskFilter(next);
  };

  /**
   * Wrap an account update so we notify the user if the row falls out of the
   * active filters as a result. Prevents the "did it just disappear?" feel.
   */
  const updateAccountWithFilterAwareness = (
    id: string,
    updates: Partial<Account>,
    accountName: string,
  ) => {
    const before = accounts.find((a) => a.id === id);
    updateAccount(id, updates);
    if (!before) return;
    const after = { ...before, ...updates };
    const wasVisible =
      riskFilter.includes(before.risk) && (statusFilter === "all" || before.status === statusFilter);
    const isVisible =
      riskFilter.includes(after.risk) && (statusFilter === "all" || after.status === statusFilter);
    if (wasVisible && !isVisible) {
      toast({
        title: "Moved out of current filter",
        description: `${accountName} moved out of the current filter after its status was updated.`,
      });
    }
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    if (selectedAccount?.id === id) {
      setSelectedAccount((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  // Deep-link from /accounts → /?focus=<id> or /?reset=1
  useEffect(() => {
    // Wait until the queue has finished loading so we don't falsely report
    // "not in queue" before data is ready.
    if (isLoading || loadError) return;

    const reset = searchParams.get("reset");
    const focusId = searchParams.get("focus");

    if (reset) {
      setRiskFilter(["high", "medium", "low"]);
      setStatusFilter("all");
      const next = new URLSearchParams(searchParams);
      next.delete("reset");
      setSearchParams(next, { replace: true });
      return;
    }

    if (!focusId) return;

    const target = accounts.find((a) => a.id === focusId);
    if (!target) {
      // Should be rare — Accounts screen pre-checks. Surfaces only if the
      // queue mutated between click and arrival.
      toast({
        title: "Not in Action Queue",
        description: "This account is not currently in the Action Queue.",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("focus");
      setSearchParams(next, { replace: true });
      return;
    }
    // Reveal the row regardless of risk OR status filters.
    if (!riskFilter.includes(target.risk)) {
      setRiskFilter((prev) => Array.from(new Set([...prev, target.risk])) as RiskLevel[]);
    }
    if (statusFilter !== "all" && statusFilter !== target.status) {
      setStatusFilter("all");
    }
    setHighlightId(focusId);
    requestAnimationFrame(() => {
      const el = cardRefs.current[focusId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const t = setTimeout(() => setHighlightId(null), 2400);
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("focus"), searchParams.get("reset"), isLoading, loadError]);

  const handleSendOutreach = (account: Account, message: string) => {
    setOutreachAccount(null);
    safeLog(
      toast,
      () => {
        /* outreach succeeds — UI updates downstream */
      },
      {
        action: "Sent outreach",
        type: "send_outreach",
        account: account.name,
        accountId: account.id,
        note: message?.slice(0, 140),
      },
    );
    toast({ title: "Outreach sent", description: `Message sent to ${account.contactName} at ${account.name}` });
    setOutcomeAccount(account);
  };

  const clearStillSearchingTimer = () => {
    if (stillSearchingTimer.current) {
      window.clearTimeout(stillSearchingTimer.current);
      stillSearchingTimer.current = null;
    }
  };

  const advanceToNextBestAccount = (justHandledId: string) => {
    lastHandledIdRef.current = justHandledId;
    setSelectedAccount(null);
    setNextBestAccount(null);
    setNextBestMode("loading");
    setNextBestStillSearching(false);
    setNextBestOpen(true);
    clearStillSearchingTimer();
    stillSearchingTimer.current = window.setTimeout(() => setNextBestStillSearching(true), 2000);

    // Simulated async lookup with rare failure for transparent UX states.
    window.setTimeout(() => {
      clearStillSearchingTimer();
      setNextBestStillSearching(false);

      // ~10% simulated failure
      if (Math.random() < 0.1) {
        setNextBestMode("error");
        return;
      }

      const riskOrder = { high: 0, medium: 1, low: 2 };
      const candidate = [...accounts]
        .filter(
          (a) => a.id !== justHandledId && a.status === "needs_action" && riskFilter.includes(a.risk),
        )
        .sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])[0];

      if (candidate) {
        setNextBestAccount(candidate);
        setNextBestMode("ready");
      } else {
        setNextBestMode("done");
      }
    }, 700);
  };

  const handleRetryNextBest = () => {
    if (lastHandledIdRef.current) advanceToNextBestAccount(lastHandledIdRef.current);
  };

  const handleContinueNextBest = (account: Account) => {
    setNextBestOpen(false);
    setNextBestAccount(null);
    setNextBestMode("ready");
    setSelectedAccount(account);
  };

  const handleStopNextBest = () => {
    clearStillSearchingTimer();
    setNextBestOpen(false);
    setNextBestAccount(null);
    setNextBestMode("ready");
    setNextBestStillSearching(false);
  };

  const handleNextBestSwitchRisk = (risk: RiskLevel) => {
    setRiskFilter([risk]);
    handleStopNextBest();
    toast({ title: "Filter updated", description: `Now viewing ${risk === "low" ? "Healthy" : risk === "medium" ? "Medium Risk" : "High Risk"} accounts.` });
  };


  const handleSaveOutcome = (account: Account, outcome: OutreachOutcome) => {
    setOutcomes((prev) => ({ ...prev, [account.id]: outcome }));
    // Map outcome → row state. Follow-up needed gets its own status now.
    let newStatus: AccountStatus = "contacted";
    if (outcome.status === "follow_up_needed" || outcome.followUpDate) {
      newStatus = "follow_up_needed";
    } else if (outcome.status === "no_response") {
      // Leave as is — outreach was attempted but not confirmed; treat as contacted for tracking.
      newStatus = "contacted";
    }
    if (outcome.followUpDate) {
      setFollowUpDates((prev) => ({ ...prev, [account.id]: outcome.followUpDate! }));
    }
    safeLog(
      toast,
      () => updateAccount(account.id, { status: newStatus }),
      {
        action: `Saved outcome: ${outcome.status.replace("_", " ")}`,
        type: "save_outcome",
        account: account.name,
        accountId: account.id,
        note: outcome.notes || (outcome.followUpDate ? `Follow-up ${outcome.followUpDate.toLocaleDateString()}` : undefined),
      },
    );
    setOutcomeAccount(null);
    toast({
      title: "Outcome saved",
      description: outcome.followUpDate
        ? `Follow-up set for ${outcome.followUpDate.toLocaleDateString()}`
        : "Outcome captured.",
    });
    advanceToNextBestAccount(account.id);
  };

  const handleSkipOutcome = (account: Account) => {
    updateAccount(account.id, { status: "contacted" });
    setOutcomeAccount(null);
    advanceToNextBestAccount(account.id);
  };

  const handleMarkReviewed = (account: Account) => {
    safeLog(
      toast,
      () => updateAccountWithFilterAwareness(account.id, { status: "reviewed" }, account.name),
      {
        action: "Marked as reviewed",
        type: "mark_reviewed",
        account: account.name,
        accountId: account.id,
      },
    );
    toast({ title: "Marked as reviewed", description: `${account.name} marked as reviewed` });
    advanceToNextBestAccount(account.id);
  };

  const handlePromptInvite = (account: Account) => {
    safeLog(
      toast,
      () => setPromptAccount(account),
      {
        action: "Sent invite prompt",
        type: "prompt_invite",
        account: account.name,
        accountId: account.id,
      },
    );
  };

  const REASON_LABELS: Record<string, string> = {
    already_contacted: "Already contacted",
    not_relevant: "Not relevant",
    waiting_on_customer: "Waiting on customer",
  };

  const DURATION_LABELS: Record<string, string> = {
    "2_days": "2 days",
    "1_week": "1 week",
    "until_renewal": "renewal",
  };

  const handleSnooze = (account: Account, data: SnoozeData) => {
    safeLog(
      toast,
      () => {
        setSnoozes((prev) => ({ ...prev, [account.id]: data }));
        updateAccount(account.id, { status: "snoozed" });
      },
      {
        action: `Snoozed for ${DURATION_LABELS[data.duration]}`,
        type: "snooze",
        account: account.name,
        accountId: account.id,
        note: data.reason ? REASON_LABELS[data.reason] : undefined,
      },
    );
    setSnoozeAccount(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(account.id);
      return next;
    });
    if (selectedAccount?.id === account.id) setSelectedAccount(null);
    toast({
      title: `Snoozed for ${DURATION_LABELS[data.duration]}`,
      description: data.reason
        ? `${account.name} · ${REASON_LABELS[data.reason]}`
        : `${account.name} kept in queue with snoozed status.`,
    });
  };

  return (
    <AppLayout title="My Accounts Requiring Attention" subtitle="Accounts at risk due to lack of early activation">
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risk Level</span>
        <ToggleGroup
          type="multiple"
          value={riskFilter}
          onValueChange={(v) => {
            if (v.length > 0) setRiskFilter(v as RiskLevel[]);
          }}
          className="gap-2"
        >
          {RISK_OPTIONS.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              aria-label={opt.label}
              className={cn(
                "h-9 px-3 rounded-md border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted transition-colors",
                opt.activeClass,
              )}
            >
              <span className={cn("h-2 w-2 rounded-full mr-2", opt.dotClass)} />
              {opt.label}
              <span className="ml-2 text-xs opacity-70">({riskCounts[opt.value]})</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide ml-4">Queue Status</span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | AccountStatus)}>
          <SelectTrigger className="h-9 w-[180px] text-sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex h-[calc(100vh-11rem)]">
        {/* Main list */}
        <div className="flex-1 overflow-y-auto pr-2">
          {/* Summary bar */}
          <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{needsActionCount} accounts need action</span>
            <span>·</span>
            <span>{accounts.filter((a) => a.risk === "high").length} high risk</span>
            <span>·</span>
            <span>{accounts.filter((a) => a.status === "contacted").length} contacted today</span>
            {snoozedCount > 0 && (
              <>
                <span>·</span>
                <span>{snoozedCount} snoozed</span>
              </>
            )}
          </div>

          <div className="space-y-3 pb-24">
            {isLoading ? (
              // Skeleton rows while queue loads
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg p-4 bg-card flex items-center gap-4"
                >
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              ))
            ) : loadError ? (
              <EmptyState
                icon={<AlertCircle className="w-6 h-6 text-[hsl(var(--risk-high))]" />}
                title="Couldn't load accounts"
                body="We ran into a problem loading this queue."
                actions={
                  <Button size="sm" onClick={loadQueue}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Retry
                  </Button>
                }
              />
            ) : sortedAccounts.length === 0 ? (
              (() => {
                // Distinct empty states based on filter context
                const onlyHigh =
                  riskFilter.length === 1 && riskFilter[0] === "high" && statusFilter === "all";
                const allHandled =
                  statusFilter === "all" &&
                  accounts.filter((a) => riskFilter.includes(a.risk)).length > 0 &&
                  accounts
                    .filter((a) => riskFilter.includes(a.risk))
                    .every((a) => a.status !== "needs_action");

                if (onlyHigh && riskCounts.high === 0) {
                  return (
                    <EmptyState
                      icon={<CheckCheck className="w-6 h-6 text-[hsl(var(--risk-low))]" />}
                      title="No high-risk accounts right now"
                      body="There are no accounts currently flagged as High Risk based on early activation and invite signals."
                      actions={
                        <>
                          <Button size="sm" variant="outline" onClick={() => setRiskFilter(["medium"])}>
                            View Medium Risk
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRiskFilter(["low"])}>
                            View Healthy
                          </Button>
                          <Button size="sm" variant="ghost" onClick={loadQueue}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Refresh queue
                          </Button>
                        </>
                      }
                    />
                  );
                }

                if (allHandled) {
                  return (
                    <EmptyState
                      icon={<Inbox className="w-6 h-6 text-[hsl(var(--risk-low))]" />}
                      title="You've handled everything in this queue"
                      body="All accounts in the current view have already been reviewed, contacted, or snoozed."
                      actions={
                        <>
                          <Button size="sm" variant="outline" onClick={() => setRiskFilter(["medium"])}>
                            View Medium Risk
                          </Button>
                          <Button size="sm" variant="outline" onClick={loadQueue}>
                            Return later
                          </Button>
                          <Button size="sm" variant="ghost" onClick={resetHandledItems}>
                            Reset handled items
                          </Button>
                        </>
                      }
                    />
                  );
                }

                return (
                  <EmptyState
                    icon={<FilterX className="w-6 h-6 text-muted-foreground" />}
                    title="No accounts match this filter"
                    body="Try changing Risk Level or Queue Status to see more accounts."
                    actions={
                      <>
                        <Button size="sm" variant="outline" onClick={resetFilters}>
                          Reset filters
                        </Button>
                        <Button size="sm" variant="ghost" onClick={resetFilters}>
                          View All
                        </Button>
                      </>
                    }
                  />
                );
              })()
            ) : (
              sortedAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  ref={(el) => (cardRefs.current[account.id] = el)}
                  account={account}
                  onSendOutreach={setOutreachAccount}
                  onPromptInvite={handlePromptInvite}
                  onMarkReviewed={handleMarkReviewed}
                  onSelect={setSelectedAccount}
                  onSnooze={setSnoozeAccount}
                  selected={selectedIds.has(account.id)}
                  onToggleSelected={toggleSelected}
                  highlight={highlightId === account.id}
                  snoozeUntil={snoozes[account.id]?.until}
                  followUpDate={followUpDates[account.id]}
                />
              ))
            )}
          </div>

        </div>
      </div>

      {/* Sticky bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-lg rounded-full pl-4 pr-2 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <div className="h-5 w-px bg-border" />
          <Button size="sm" variant="default" className="h-8 text-xs" onClick={handleBulkSendOutreach}>
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            Send Outreach
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleBulkMarkReviewed}>
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            Mark as Reviewed
          </Button>
          <Popover open={bulkFollowUpOpen} onOpenChange={setBulkFollowUpOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                Assign Follow-up
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center" side="top">
              <Calendar
                mode="single"
                onSelect={handleBulkAssignFollowUp}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full"
            onClick={clearSelection}
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail panel */}
      {selectedAccount && (
        <AccountDetailPanel
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onSendOutreach={setOutreachAccount}
        />
      )}

      <OutreachModal
        account={outreachAccount}
        open={!!outreachAccount}
        onClose={() => setOutreachAccount(null)}
        onSend={handleSendOutreach}
      />
      <OutcomeModal
        account={outcomeAccount}
        open={!!outcomeAccount}
        onClose={() => setOutcomeAccount(null)}
        onSave={handleSaveOutcome}
        onSkip={handleSkipOutcome}
      />
      <PromptInviteModal
        account={promptAccount}
        open={!!promptAccount}
        onClose={() => setPromptAccount(null)}
      />
      <NextBestAccountModal
        account={nextBestAccount}
        open={nextBestOpen}
        mode={nextBestMode}
        stillSearching={nextBestStillSearching}
        onContinue={handleContinueNextBest}
        onStop={handleStopNextBest}
        onRetry={handleRetryNextBest}
        onSwitchRisk={handleNextBestSwitchRisk}
        onReturnToQueue={handleStopNextBest}
      />
      <SnoozeModal
        account={snoozeAccount}
        open={!!snoozeAccount}
        onClose={() => setSnoozeAccount(null)}
        onSnooze={handleSnooze}
      />
    </AppLayout>
  );
}
