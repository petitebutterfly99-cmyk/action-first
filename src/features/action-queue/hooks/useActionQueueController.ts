import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth";
import { safeLog } from "@/features/activity-log";
import { trackEvent } from "@/features/analytics";
import {
  Account,
  AccountStatus,
  RiskLevel,
} from "@/shared/data/accounts";
import { useInfiniteList } from "@/shared/hooks/useInfiniteList";
import type { OutreachOutcome } from "@/features/outcome";
import {
  DURATION_LABELS,
  REASON_LABELS,
  SnoozeData,
} from "@/features/snooze";
import {
  computeRiskCounts,
  computeStatusCounts,
  countContactedToday,
  selectQueue,
} from "../api/queueLogic";
import { useAccountsData } from "./useAccountsData";
import { useBulkSelection } from "./useBulkSelection";
import { useNextBestAccount } from "./useNextBestAccount";
import { useFocusFromUrl } from "./useFocusFromUrl";

const QUEUE_BATCH_SIZE = 50;

/**
 * The single page-level orchestrator for the Action Queue.
 *
 * Composes the smaller hooks (data, bulk selection, next-best, URL focus)
 * with the modal open/close state and all the action handlers. The page
 * component just reads from the returned object and renders.
 *
 * Why one big controller? Modals share enough state (selected account,
 * outcome modal opens after outreach, next-best fires after every action)
 * that splitting further would just push the wiring back into the page.
 */
export function useActionQueueController() {
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const csmLabel = profile?.full_name || user?.email || "You";

  const data = useAccountsData();
  const { accounts, setAccounts } = data;
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  // Modal + side-panel open state ------------------------------------------
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [outreachAccount, setOutreachAccount] = useState<Account | null>(null);
  const [outcomeAccount, setOutcomeAccount] = useState<Account | null>(null);
  const [promptAccount, setPromptAccount] = useState<Account | null>(null);
  const [snoozeAccount, setSnoozeAccount] = useState<Account | null>(null);
  const [bulkFollowUpOpen, setBulkFollowUpOpen] = useState(false);

  // Filters ----------------------------------------------------------------
  const [riskFilter, setRiskFilter] = useState<RiskLevel[]>(["high", "medium", "low"]);
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");

  // Bulk selection ---------------------------------------------------------
  const bulk = useBulkSelection();

  // Per-row metadata captured by modals (snoozes, outcomes) ----------------
  const [outcomes, setOutcomes] = useState<Record<string, OutreachOutcome>>({});
  const [snoozes, setSnoozes] = useState<Record<string, SnoozeData>>({});

  // Refs for scroll-to-row when deep-linking via ?focus= -------------------
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Derived data -----------------------------------------------------------
  const riskCounts = useMemo(() => computeRiskCounts(accounts), [accounts]);
  const statusCounts = useMemo(
    () => computeStatusCounts(accounts, riskFilter),
    [accounts, riskFilter],
  );
  const sortedAccounts = useMemo(
    () => selectQueue(accounts, riskFilter, statusFilter),
    [accounts, riskFilter, statusFilter],
  );
  const {
    visible: visibleAccounts,
    hasMore: hasMoreAccounts,
    sentinelRef: queueSentinelRef,
    revealAtLeast: revealAccountsAtLeast,
    visibleCount: visibleAccountsCount,
  } = useInfiniteList(sortedAccounts, QUEUE_BATCH_SIZE);
  const loadMoreAccounts = () =>
    revealAccountsAtLeast(visibleAccountsCount + QUEUE_BATCH_SIZE);

  const snoozedCount = accounts.filter((a) => a.status === "snoozed").length;
  const needsActionCount = accounts.filter(
    (a) => a.status === "needs_action" && a.risk !== "low",
  ).length;
  // Aggregate "Contacted Today" — derived from the same row-level
  // last_outreach_sent_at timestamp that drives the row label. Re-sending
  // to the same account today does not double-count.
  const contactedTodayCount = useMemo(() => countContactedToday(accounts), [accounts]);
  const isDefaultFilters = riskFilter.length === 3 && statusFilter === "all";

  // Track filter usage. Skip the initial render (default filters) so we only
  // emit when the CSM changes something. Pairs with `filter_zero_results`
  // when the new filter combination yields no rows.
  const isFirstFilterRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstFilterRenderRef.current) {
      isFirstFilterRenderRef.current = false;
      return;
    }
    void trackEvent({
      type: "filter_applied",
      metadata: { risk: riskFilter, status: statusFilter },
    });
    if (!data.isLoading && accounts.length > 0 && sortedAccounts.length === 0) {
      void trackEvent({
        type: "filter_zero_results",
        metadata: { risk: riskFilter, status: statusFilter },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskFilter, statusFilter]);

  // Update an account both in state and DB; warn if it falls out of the
  // currently-applied filter so the CSM understands why it disappeared.
  const updateAccountWithFilterAwareness = (
    id: string,
    updates: Partial<Account>,
    accountName: string,
  ) => {
    const before = accounts.find((a) => a.id === id);
    data.updateAccount(id, updates);
    if (selectedAccount?.id === id) {
      setSelectedAccount((prev) => (prev ? { ...prev, ...updates } : null));
    }
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

  // Next-best momentum modal -----------------------------------------------
  const nextBest = useNextBestAccount({
    getAccounts: () => accountsRef.current,
    riskFilter,
    onContinue: (acc) => setSelectedAccount(acc),
    onSwitchRisk: (risk) => setRiskFilter([risk]),
  });

  // URL focus / reset handling --------------------------------------------
  const { highlightId } = useFocusFromUrl({
    isLoading: data.isLoading,
    loadError: data.loadError,
    accounts,
    sortedAccounts,
    riskFilter,
    setRiskFilter,
    statusFilter,
    setStatusFilter,
    cardRefs,
    revealAtLeast: revealAccountsAtLeast,
  });

  // Filter helpers ---------------------------------------------------------
  const clearFilters = () => {
    setRiskFilter(["high", "medium", "low"]);
    setStatusFilter("all");
  };
  const removeRiskChip = (r: RiskLevel) => {
    const next = riskFilter.filter((x) => x !== r);
    if (next.length === 0) setRiskFilter(["high", "medium", "low"]);
    else setRiskFilter(next);
  };
  const resetHandledItems = () => {
    data.resetHandledItems();
    setSnoozes({});
  };

  // Emit a normalized `action_committed` event so action-rate / action-mix
  // can be derived from one stream regardless of which surface triggered it.
  const commitAction = (
    accountId: string,
    action:
      | "send_outreach"
      | "prompt_invite"
      | "mark_reviewed"
      | "snooze"
      | "save_outcome",
    extra?: Record<string, unknown>,
  ) => {
    void trackEvent({
      type: "action_committed",
      accountId,
      metadata: { action, ...(extra ?? {}) },
    });
  };


  // Single-account action handlers ----------------------------------------
  const handleSendOutreach = (account: Account, message: string) => {
    setOutreachAccount(null);
    const sentAt = new Date().toISOString();
    // Atomic row update: status + timestamp + count, derived from the same
    // success boundary. The timestamp is the source of truth for both the
    // row's "Contacted today" label and the aggregate metric.
    const rowUpdates: Partial<Account> = {
      status: "contacted",
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
    commitAction(account.id, "send_outreach");
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
      bulk.setFollowUpDates((prev) => ({ ...prev, [account.id]: outcome.followUpDate! }));
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
    setSelectedAccount(null);
    commitAction(account.id, "save_outcome", { outcome_status: outcome.status });
    nextBest.advance(account.id);
  };

  const handleSkipOutcome = (account: Account) => {
    updateAccountWithFilterAwareness(account.id, { status: "contacted" }, account.name);
    setOutcomeAccount(null);
    setSelectedAccount(null);
    nextBest.advance(account.id);
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
    setSelectedAccount(null);
    commitAction(account.id, "mark_reviewed");
    nextBest.advance(account.id);
  };

  const handlePromptInvite = (account: Account) => {
    safeLog(toast, () => setPromptAccount(account), {
      action: "Sent invite prompt",
      type: "prompt_invite",
      account: account.name,
      accountId: account.id,
    });
    commitAction(account.id, "prompt_invite");
  };

  const handleSnooze = (account: Account, snoozeData: SnoozeData) => {
    safeLog(
      toast,
      () => {
        setSnoozes((prev) => ({ ...prev, [account.id]: snoozeData }));
        updateAccountWithFilterAwareness(account.id, { status: "snoozed" }, account.name);
      },
      {
        action: `Snoozed for ${DURATION_LABELS[snoozeData.duration]}`,
        type: "snooze",
        account: account.name,
        accountId: account.id,
        note: snoozeData.reason ? REASON_LABELS[snoozeData.reason] : undefined,
      },
    );
    setSnoozeAccount(null);
    bulk.removeFromSelection(account.id);
    if (selectedAccount?.id === account.id) setSelectedAccount(null);
    toast({
      title: `Snoozed for ${DURATION_LABELS[snoozeData.duration]}`,
      description: snoozeData.reason
        ? `${account.name} · ${REASON_LABELS[snoozeData.reason]}`
        : `${account.name} kept in queue with snoozed status.`,
    });
    commitAction(account.id, "snooze", { duration: snoozeData.duration });
  };

  // Bulk handlers ---------------------------------------------------------
  const handleBulkSendOutreach = () => {
    const ids = Array.from(bulk.selectedIds);
    const targets = accounts.filter((a) => ids.includes(a.id));
    const sentAt = new Date().toISOString();
    safeLog(
      toast,
      () =>
        data.bulkUpdateAccounts(bulk.selectedIds, (a) => ({
          status: "contacted",
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
    ids.forEach((id) => commitAction(id, "send_outreach", { bulk: true }));
    bulk.clearSelection();
  };

  const handleBulkMarkReviewed = () => {
    const ids = Array.from(bulk.selectedIds);
    const targets = accounts.filter((a) => ids.includes(a.id));
    safeLog(
      toast,
      () => data.bulkUpdateAccounts(bulk.selectedIds, () => ({ status: "reviewed" })),
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
    ids.forEach((id) => commitAction(id, "mark_reviewed", { bulk: true }));
    bulk.clearSelection();
  };

  const handleBulkAssignFollowUp = (date: Date | undefined) => {
    if (!date) return;
    const ids = Array.from(bulk.selectedIds);
    const targets = accounts.filter((a) => ids.includes(a.id));
    bulk.setFollowUpForIds(ids, date);
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
    ids.forEach((id) => commitAction(id, "save_outcome", { bulk: true, follow_up: true }));
    bulk.clearSelection();
  };

  return {
    // Data + derived
    accounts,
    isLoading: data.isLoading,
    loadError: data.loadError,
    loadQueue: data.loadQueue,
    riskCounts,
    statusCounts,
    sortedAccounts,
    visibleAccounts,
    hasMoreAccounts,
    queueSentinelRef,
    snoozedCount,
    needsActionCount,
    contactedTodayCount,
    isDefaultFilters,
    // Filters
    riskFilter,
    setRiskFilter,
    statusFilter,
    setStatusFilter,
    clearFilters,
    removeRiskChip,
    resetHandledItems,
    // Bulk selection + follow-up
    selectedIds: bulk.selectedIds,
    toggleSelected: bulk.toggleSelected,
    clearSelection: bulk.clearSelection,
    followUpDates: bulk.followUpDates,
    bulkFollowUpOpen,
    setBulkFollowUpOpen,
    handleBulkSendOutreach,
    handleBulkMarkReviewed,
    handleBulkAssignFollowUp,
    // Modal open state
    selectedAccount,
    setSelectedAccount,
    outreachAccount,
    setOutreachAccount,
    outcomeAccount,
    setOutcomeAccount,
    promptAccount,
    setPromptAccount,
    snoozeAccount,
    setSnoozeAccount,
    // Per-row state
    snoozes,
    highlightId,
    cardRefs,
    // Action handlers
    handleSendOutreach,
    handleSaveOutcome,
    handleSkipOutcome,
    handleMarkReviewed,
    handlePromptInvite,
    handleSnooze,
    // Next-best
    nextBest,
    // Outcomes (kept for completeness even though not currently rendered)
    outcomes,
  };
}
