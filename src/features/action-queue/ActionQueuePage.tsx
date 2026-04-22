import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertCircle,
  CalendarIcon,
  CheckCheck,
  CheckCircle,
  FilterX,
  Inbox,
  MessageCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { AppLayout } from "@/shared/components/AppLayout";
import { EmptyState } from "@/shared/components/EmptyState";
import { useAuth } from "@/features/auth/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  Account,
  AccountStatus,
  RiskLevel,
  bulkUpdateAccountsInDb,
  fetchAccounts,
  updateAccountInDb,
} from "@/shared/data/accounts";

import { safeLog } from "@/features/activity-log/safeLog";
import { ActionQueueRow } from "./components/ActionQueueRow";
import {
  RISK_LABEL,
  STATUS_LABEL,
  computeRiskCounts,
  computeStatusCounts,
  countContactedToday,
  pickNextBestCandidate,
  selectQueue,
} from "./queueLogic";

import { AccountDetailPanel } from "@/features/account-detail/AccountDetailPanel";
import { OutreachModal } from "@/features/outreach/OutreachModal";
import { OutcomeModal, OutreachOutcome } from "@/features/outcome/OutcomeModal";
import { PromptInviteModal } from "@/features/prompt-invite/PromptInviteModal";
import {
  NextBestAccountModal,
  NextBestMode,
} from "@/features/next-best-account/NextBestAccountModal";
import { SnoozeModal } from "@/features/snooze/SnoozeModal";
import {
  DURATION_LABELS,
  REASON_LABELS,
  SnoozeData,
} from "@/features/snooze/snoozeOptions";

const STATUS_FILTER_OPTIONS: { value: "all" | AccountStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "contacted", label: "Contacted" },
  { value: "reviewed", label: "Reviewed" },
  { value: "snoozed", label: "Snoozed" },
  { value: "follow_up_needed", label: "Follow-up Needed" },
];

const RISK_OPTIONS: {
  value: RiskLevel;
  label: string;
  dotClass: string;
  activeClass: string;
}[] = [
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

export default function ActionQueuePage() {
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const csmLabel = profile?.full_name || user?.email || "You";
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [outreachAccount, setOutreachAccount] = useState<Account | null>(null);
  const [outcomeAccount, setOutcomeAccount] = useState<Account | null>(null);
  const [promptAccount, setPromptAccount] = useState<Account | null>(null);
  const [nextBestAccount, setNextBestAccount] = useState<Account | null>(null);
  const [nextBestMode, setNextBestMode] = useState<NextBestMode>("ready");
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

  const resetHandledItems = () => {
    setAccounts((prev) =>
      prev.map((a) => ({ ...a, status: "needs_action" as AccountStatus })),
    );
    setSnoozes({});
    setFollowUpDates({});
    toast({
      title: "Handled items reset",
      description: "All accounts moved back to Needs Action.",
    });
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
    // Group identical updates and fire one bulk DB write per group.
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

  const handleBulkSendOutreach = () => {
    const ids = Array.from(selectedIds);
    const targets = accounts.filter((a) => ids.includes(a.id));
    const sentAt = new Date().toISOString();
    safeLog(
      toast,
      () =>
        applyBulk((a) => ({
          status: "contacted" as AccountStatus,
          lastOutreachSentAt: sentAt,
          lastOutreachSentBy: csmLabel,
          outreachCount: (a.outreachCount ?? 0) + 1,
        })),
      {
        action: `Sent outreach to ${ids.length} accounts`,
        type: "send_outreach",
        account: targets.map((t) => t.name).join(", "),
      },
    );
    toast({
      title: "Outreach sent",
      description: `Sent to ${ids.length} account${ids.length > 1 ? "s" : ""}.`,
    });
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
    toast({
      title: "Marked as reviewed",
      description: `${ids.length} account${ids.length > 1 ? "s" : ""} marked as reviewed.`,
    });
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
          prev.map((a) =>
            ids.includes(a.id) ? { ...a, status: "follow_up_needed" as AccountStatus } : a,
          ),
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

  const riskCounts = useMemo(() => computeRiskCounts(accounts), [accounts]);
  const statusCounts = useMemo(
    () => computeStatusCounts(accounts, riskFilter),
    [accounts, riskFilter],
  );
  const sortedAccounts = useMemo(
    () => selectQueue(accounts, riskFilter, statusFilter),
    [accounts, riskFilter, statusFilter],
  );

  const snoozedCount = accounts.filter((a) => a.status === "snoozed").length;
  const needsActionCount = accounts.filter(
    (a) => a.status === "needs_action" && a.risk !== "low",
  ).length;
  // Aggregate "Contacted Today" — derived from the same row-level
  // last_outreach_sent_at timestamp that drives the row label. Re-sending
  // to the same account today does not double-count.
  const contactedTodayCount = useMemo(() => countContactedToday(accounts), [accounts]);

  const isDefaultFilters = riskFilter.length === 3 && statusFilter === "all";

  const clearFilters = () => {
    setRiskFilter(["high", "medium", "low"]);
    setStatusFilter("all");
  };

  const removeRiskChip = (r: RiskLevel) => {
    const next = riskFilter.filter((x) => x !== r);
    if (next.length === 0) setRiskFilter(["high", "medium", "low"]);
    else setRiskFilter(next);
  };

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
      riskFilter.includes(before.risk) &&
      (statusFilter === "all" || before.status === statusFilter);
    const isVisible =
      riskFilter.includes(after.risk) &&
      (statusFilter === "all" || after.status === statusFilter);
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
    updateAccountInDb(id, updates).catch(() => {
      toast({
        title: "Couldn't sync change",
        description: "This update didn't save to the server.",
        variant: "destructive",
      });
    });
  };

  useEffect(() => {
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
      toast({
        title: "Not in Action Queue",
        description: "This account is not currently in the Action Queue.",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("focus");
      setSearchParams(next, { replace: true });
      return;
    }
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
  }, [searchParams.get("focus"), searchParams.get("reset"), isLoading, loadError]);

  const handleSendOutreach = (account: Account, message: string) => {
    setOutreachAccount(null);
    const sentAt = new Date().toISOString();
    // Atomic row update: status + timestamp + count, derived from the same
    // success boundary. The timestamp is the source of truth for both the
    // row's "Contacted today" label and the aggregate metric.
    const rowUpdates: Partial<Account> = {
      status: "contacted" as AccountStatus,
      lastOutreachSentAt: sentAt,
      lastOutreachSentBy: csmLabel,
      outreachCount: (account.outreachCount ?? 0) + 1,
    };
    safeLog(
      toast,
      () => updateAccountWithFilterAwareness(account.id, rowUpdates, account.name),
      {
        action: "Sent outreach",
        type: "send_outreach",
        account: account.name,
        accountId: account.id,
        note: message?.slice(0, 140),
      },
    );
    toast({
      title: "Outreach sent",
      description: `Message sent to ${account.contactName} at ${account.name}`,
    });
    setOutcomeAccount({ ...account, ...rowUpdates });
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
    stillSearchingTimer.current = window.setTimeout(
      () => setNextBestStillSearching(true),
      2000,
    );

    window.setTimeout(() => {
      clearStillSearchingTimer();
      setNextBestStillSearching(false);

      if (Math.random() < 0.1) {
        setNextBestMode("error");
        return;
      }

      const candidate = pickNextBestCandidate(accounts, justHandledId, riskFilter);
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
    toast({
      title: "Filter updated",
      description: `Now viewing ${risk === "low" ? "Healthy" : risk === "medium" ? "Medium Risk" : "High Risk"} accounts.`,
    });
  };

  const handleSaveOutcome = (account: Account, outcome: OutreachOutcome) => {
    setOutcomes((prev) => ({ ...prev, [account.id]: outcome }));
    let newStatus: AccountStatus = "contacted";
    if (outcome.status === "follow_up_needed" || outcome.followUpDate) {
      newStatus = "follow_up_needed";
    } else if (outcome.status === "no_response") {
      newStatus = "contacted";
    }
    if (outcome.followUpDate) {
      setFollowUpDates((prev) => ({ ...prev, [account.id]: outcome.followUpDate! }));
    }
    safeLog(
      toast,
      () => updateAccountWithFilterAwareness(account.id, { status: newStatus }, account.name),
      {
        action: `Saved outcome: ${outcome.status.replace("_", " ")}`,
        type: "save_outcome",
        account: account.name,
        accountId: account.id,
        note:
          outcome.notes ||
          (outcome.followUpDate
            ? `Follow-up ${outcome.followUpDate.toLocaleDateString()}`
            : undefined),
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
    updateAccountWithFilterAwareness(account.id, { status: "contacted" }, account.name);
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
    toast({
      title: "Marked as reviewed",
      description: `${account.name} marked as reviewed`,
    });
    advanceToNextBestAccount(account.id);
  };

  const handlePromptInvite = (account: Account) => {
    safeLog(toast, () => setPromptAccount(account), {
      action: "Sent invite prompt",
      type: "prompt_invite",
      account: account.name,
      accountId: account.id,
    });
  };

  const handleSnooze = (account: Account, data: SnoozeData) => {
    safeLog(
      toast,
      () => {
        setSnoozes((prev) => ({ ...prev, [account.id]: data }));
        updateAccountWithFilterAwareness(account.id, { status: "snoozed" }, account.name);
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
    <AppLayout
      title="My Accounts Requiring Attention"
      subtitle="Accounts at risk due to lack of early activation"
    >
      <div className="mb-4 pb-4 border-b border-border space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Risk Level
          </span>
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
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide ml-2">
            Queue Status
          </span>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "all" | AccountStatus)}
          >
            <SelectTrigger className="h-9 w-[200px] text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => {
                const count =
                  opt.value === "all" ? statusCounts.all : statusCounts[opt.value];
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center justify-between w-full gap-3">
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {!isDefaultFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground hover:text-foreground ml-auto"
              onClick={clearFilters}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        {!isDefaultFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Active:
            </span>
            {riskFilter.length < 3 &&
              riskFilter.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-muted text-xs text-foreground border border-border"
                >
                  {RISK_LABEL[r]}
                  <button
                    type="button"
                    aria-label={`Remove ${RISK_LABEL[r]} filter`}
                    onClick={() => removeRiskChip(r)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-muted text-xs text-foreground border border-border">
                {STATUS_LABEL[statusFilter]}
                <button
                  type="button"
                  aria-label="Remove status filter"
                  onClick={() => setStatusFilter("all")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex h-[calc(100vh-11rem)]">
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {needsActionCount} accounts need action
            </span>
            <span>·</span>
            <span>{accounts.filter((a) => a.risk === "high").length} high risk</span>
            <span>·</span>
            <span>
              {contactedTodayCount} contacted today
            </span>
            {snoozedCount > 0 && (
              <>
                <span>·</span>
                <span>{snoozedCount} snoozed</span>
              </>
            )}
          </div>

          <div className="space-y-3 pb-24">
            {isLoading ? (
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
                const onlyHigh =
                  riskFilter.length === 1 &&
                  riskFilter[0] === "high" &&
                  statusFilter === "all";
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRiskFilter(["medium"])}
                          >
                            View Medium Risk
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRiskFilter(["low"])}
                          >
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRiskFilter(["medium"])}
                          >
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
                <ActionQueueRow
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

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-lg rounded-full pl-4 pr-2 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <div className="h-5 w-px bg-border" />
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs"
            onClick={handleBulkSendOutreach}
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            Send Outreach
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleBulkMarkReviewed}
          >
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
