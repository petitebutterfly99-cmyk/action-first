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
import { cn } from "@/lib/utils";

import type { AccountStatus, RiskLevel } from "@/shared/data/accounts";

import { ActionQueueRow } from "./ActionQueueRow";
import { RISK_LABEL, STATUS_LABEL } from "../api/queueLogic";
import { useActionQueueController } from "../hooks/useActionQueueController";

import { AccountDetailPanel } from "@/features/account-detail";
import { OutreachModal } from "@/features/outreach";
import { OutcomeModal } from "@/features/outcome";
import { PromptInviteModal } from "@/features/prompt-invite";
import { NextBestAccountModal } from "@/features/next-best-account";
import { SnoozeModal } from "@/features/snooze";
import {
  KpiRow,
  CsmPerformancePanel,
  useSession,
  useMetrics,
  trackEvent,
} from "@/features/analytics";
import {
  GuidedCallout,
  GuidedSuccessModal,
  useGuidedTour,
} from "@/features/guided-tour";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionQueueHero } from "./ActionQueueHero";
import { pickNextBestCandidate } from "../api/queueLogic";

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

/**
 * Action Queue page — presentation only.
 *
 * All state, side effects, and DB calls live in `useActionQueueController`
 * and the smaller hooks it composes. This component just reads from the
 * controller and renders chrome, filters, the row list, and modals.
 */
export default function ActionQueuePage() {
  const c = useActionQueueController();
  const guided = useGuidedTour();

  // Analytics: start/refresh session + derive in-page KPIs.
  const { sessionStartedISO } = useSession();
  const surfacedAccountIds = useMemo(
    () => c.sortedAccounts.map((a) => a.id),
    [c.sortedAccounts],
  );
  const highRiskAccountIds = useMemo(
    () => c.accounts.filter((a) => a.risk === "high").map((a) => a.id),
    [c.accounts],
  );
  const metrics = useMetrics({
    sessionStartedISO,
    surfacedAccountIds,
    highRiskAccountIds,
  });

  // Top high-risk actionable account — drives both the hero CTA and the
  // guided tour's highlighted row.
  const topHighRiskAccount = useMemo(
    () =>
      c.accounts.find(
        (a) => a.risk === "high" && a.status === "needs_action",
      ) ?? c.accounts.find((a) => a.risk === "high"),
    [c.accounts],
  );

  // Auto-start the tour exactly once after the user's first authenticated
  // load that surfaces a high-risk account. Persisted per-browser so it
  // doesn't pop up on every visit.
  const autoStartTriedRef = useRef(false);
  useEffect(() => {
    if (autoStartTriedRef.current) return;
    if (c.isLoading || c.loadError) return;
    autoStartTriedRef.current = true;
    try {
      if (typeof window !== "undefined") {
        const seen = window.localStorage.getItem("retainiq:guided-seen");
        if (!seen && topHighRiskAccount) {
          guided.start(topHighRiskAccount.id, { source: "auto" });
          window.localStorage.setItem("retainiq:guided-seen", "1");
        }
      }
    } catch {
      // localStorage unavailable — silently skip auto-start.
    }
  }, [c.isLoading, c.loadError, topHighRiskAccount, guided]);

  // Compute the live "guided account" so it follows state changes (e.g.
  // status moves, account dropped from queue, etc).
  const guidedAccount = useMemo(
    () =>
      guided.focusAccountId
        ? c.accounts.find((a) => a.id === guided.focusAccountId) ?? null
        : null,
    [guided.focusAccountId, c.accounts],
  );

  const [guidedSuccessOpen, setGuidedSuccessOpen] = useState(false);
  // Track outreach-just-sent so we know to advance the tour without
  // double-firing for non-guided sends.
  const guidedSendInFlightRef = useRef(false);

  // Intercept the outreach send handler so we can advance the tour.
  const handleSendOutreachWithGuided = (account: import("@/shared/data/accounts").Account, message: string) => {
    const wasGuided = guided.active && guided.focusAccountId === account.id;
    if (wasGuided) {
      guidedSendInFlightRef.current = true;
      void trackEvent({
        type: "outreach_sent_from_guided_flow",
        accountId: account.id,
      });
    }
    c.handleSendOutreach(account, message);
    if (wasGuided) {
      // Skip the outcome modal for the first guided send; replace it with
      // the success modal so the user sees a clear "first action complete".
      c.setOutcomeAccount(null);
      guided.goTo("success");
      setGuidedSuccessOpen(true);
    }
  };

  const startWithHighestRisk = () => {
    if (!topHighRiskAccount) return;
    void trackEvent({
      type: "highest_risk_cta_clicked",
      accountId: topHighRiskAccount.id,
    });
    // Make sure the row is visible — widen risk filter if needed.
    if (!c.riskFilter.includes("high")) {
      c.setRiskFilter(Array.from(new Set([...c.riskFilter, "high"])) as typeof c.riskFilter);
    }
    if (c.statusFilter !== "all" && c.statusFilter !== topHighRiskAccount.status) {
      c.setStatusFilter("all");
    }
    guided.start(topHighRiskAccount.id, { source: "manual" });
    requestAnimationFrame(() => {
      const el = c.cardRefs.current[topHighRiskAccount.id];
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const toggleGuided = () => {
    if (guided.active) {
      guided.exit("user");
      setGuidedSuccessOpen(false);
    } else {
      startWithHighestRisk();
    }
  };

  const guidedNextAccount = useMemo(() => {
    if (!guidedAccount) return undefined;
    return pickNextBestCandidate(c.accounts, guidedAccount.id, ["high"]);
  }, [c.accounts, guidedAccount]);

  const handleGuidedNext = () => {
    setGuidedSuccessOpen(false);
    if (guidedNextAccount) {
      guided.start(guidedNextAccount.id, { source: "manual" });
      requestAnimationFrame(() => {
        const el = c.cardRefs.current[guidedNextAccount.id];
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } else {
      guided.exit("completed");
    }
  };

  const handleGuidedExit = () => {
    setGuidedSuccessOpen(false);
    guided.exit("user");
  };

  // When the user opens the detail panel for the guided account, advance.
  useEffect(() => {
    if (
      guided.active &&
      guided.step === "highlight" &&
      c.selectedAccount &&
      c.selectedAccount.id === guided.focusAccountId
    ) {
      guided.goTo("detail");
      void trackEvent({
        type: "account_detail_opened_from_guided_flow",
        accountId: c.selectedAccount.id,
      });
    }
  }, [guided, c.selectedAccount]);

  // When the outreach modal opens for the guided account, advance.
  useEffect(() => {
    if (
      guided.active &&
      (guided.step === "highlight" || guided.step === "detail") &&
      c.outreachAccount &&
      c.outreachAccount.id === guided.focusAccountId
    ) {
      guided.goTo("outreach");
      void trackEvent({
        type: "outreach_modal_opened_from_guided_flow",
        accountId: c.outreachAccount.id,
      });
    }
  }, [guided, c.outreachAccount]);

  return (
    <AppLayout
      title="My Accounts Requiring Attention"
      subtitle="Accounts at risk due to lack of early activation"
    >
      {/* Purpose-clarifying hero ----------------------------------------- */}
      <ActionQueueHero
        highRiskCount={c.riskCounts.high}
        hasHighestRisk={!!topHighRiskAccount}
        guidedActive={guided.active}
        onStartHighest={startWithHighestRisk}
        onToggleGuided={toggleGuided}
      />

      {/* Lightweight KPI row + collapsible secondary panel ----------------- */}
      <KpiRow metrics={metrics} />
      <CsmPerformancePanel metrics={metrics} />

      {/* Filters --------------------------------------------------------- */}
      <div className="mb-4 pb-4 border-b border-border space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Risk Level
          </span>
          <ToggleGroup
            type="multiple"
            value={c.riskFilter}
            onValueChange={(v) => {
              if (v.length > 0) c.setRiskFilter(v as RiskLevel[]);
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
                <span className="ml-2 text-xs opacity-70">({c.riskCounts[opt.value]})</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide ml-2">
            Queue Status
          </span>
          <Select
            value={c.statusFilter}
            onValueChange={(v) => c.setStatusFilter(v as "all" | AccountStatus)}
          >
            <SelectTrigger className="h-9 w-[200px] text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => {
                const count =
                  opt.value === "all" ? c.statusCounts.all : c.statusCounts[opt.value];
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
          {!c.isDefaultFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground hover:text-foreground ml-auto"
              onClick={c.clearFilters}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        {!c.isDefaultFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Active:
            </span>
            {c.riskFilter.length < 3 &&
              c.riskFilter.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-muted text-xs text-foreground border border-border"
                >
                  {RISK_LABEL[r]}
                  <button
                    type="button"
                    aria-label={`Remove ${RISK_LABEL[r]} filter`}
                    onClick={() => c.removeRiskChip(r)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            {c.statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-muted text-xs text-foreground border border-border">
                {STATUS_LABEL[c.statusFilter]}
                <button
                  type="button"
                  aria-label="Remove status filter"
                  onClick={() => c.setStatusFilter("all")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Queue list ------------------------------------------------------ */}
      <div className="flex h-[calc(100vh-11rem)]">
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {c.needsActionCount} accounts need action
            </span>
            <span>·</span>
            <span>{c.accounts.filter((a) => a.risk === "high").length} high risk</span>
            <span>·</span>
            <span>{c.contactedTodayCount} contacted today</span>
            {c.snoozedCount > 0 && (
              <>
                <span>·</span>
                <span>{c.snoozedCount} snoozed</span>
              </>
            )}
          </div>

          <div className="space-y-3 pb-24">
            {c.isLoading ? (
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
            ) : c.loadError ? (
              <EmptyState
                icon={<AlertCircle className="w-6 h-6 text-[hsl(var(--risk-high))]" />}
                title={c.loadError.title}
                body={c.loadError.message}
                actions={
                  <Button size="sm" onClick={c.loadQueue}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Retry
                  </Button>
                }
              />
            ) : c.sortedAccounts.length === 0 ? (
              (() => {
                if (c.accounts.length === 0) {
                  return (
                    <EmptyState
                      icon={<Inbox className="w-6 h-6 text-muted-foreground" />}
                      title="No assigned accounts"
                      body="You don't have any accounts assigned yet."
                      actions={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            (window.location.href = "mailto:admin@example.com")
                          }
                        >
                          Contact admin
                        </Button>
                      }
                    />
                  );
                }
                const onlyHigh =
                  c.riskFilter.length === 1 &&
                  c.riskFilter[0] === "high" &&
                  c.statusFilter === "all";
                const allHandled =
                  c.statusFilter === "all" &&
                  c.accounts.filter((a) => c.riskFilter.includes(a.risk)).length > 0 &&
                  c.accounts
                    .filter((a) => c.riskFilter.includes(a.risk))
                    .every((a) => a.status !== "needs_action");

                if (onlyHigh && c.riskCounts.high === 0) {
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
                            onClick={() => c.setRiskFilter(["medium"])}
                          >
                            View Medium Risk
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => c.setRiskFilter(["low"])}
                          >
                            View Healthy
                          </Button>
                          <Button size="sm" variant="ghost" onClick={c.loadQueue}>
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
                            onClick={() => c.setRiskFilter(["medium"])}
                          >
                            View Medium Risk
                          </Button>
                          <Button size="sm" variant="outline" onClick={c.loadQueue}>
                            Return later
                          </Button>
                          <Button size="sm" variant="ghost" onClick={c.resetHandledItems}>
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
                        <Button size="sm" variant="outline" onClick={c.clearFilters}>
                          Reset filters
                        </Button>
                        <Button size="sm" variant="ghost" onClick={c.clearFilters}>
                          View All
                        </Button>
                      </>
                    }
                  />
                );
              })()
            ) : (
              <>
                {c.visibleAccounts.map((account) => {
                  const isGuidedTarget =
                    guided.active &&
                    guided.step === "highlight" &&
                    guided.focusAccountId === account.id;
                  return (
                    <div key={account.id} className="space-y-2">
                      {isGuidedTarget && (
                        <GuidedCallout
                          stepNumber={1}
                          totalSteps={3}
                          title="Start here"
                          body="This account has not invited teammates and is at risk of early churn. Open it to see the activation timeline."
                          ctaLabel="View account details"
                          onCta={() => c.setSelectedAccount(account)}
                          onExit={handleGuidedExit}
                        />
                      )}
                      <ActionQueueRow
                        ref={(el) => (c.cardRefs.current[account.id] = el)}
                        account={account}
                        onSendOutreach={c.setOutreachAccount}
                        onPromptInvite={c.handlePromptInvite}
                        onMarkReviewed={c.handleMarkReviewed}
                        onSelect={c.setSelectedAccount}
                        onSnooze={c.setSnoozeAccount}
                        selected={c.selectedIds.has(account.id)}
                        onToggleSelected={c.toggleSelected}
                        highlight={
                          c.highlightId === account.id || isGuidedTarget
                        }
                        snoozeUntil={c.snoozes[account.id]?.until}
                        followUpDate={c.followUpDates[account.id]}
                      />
                    </div>
                  );
                })}
                {c.hasMoreAccounts ? (
                  <div
                    ref={c.queueSentinelRef}
                    className="py-4 flex flex-col items-center gap-2"
                  >
                    <Button size="sm" variant="ghost" onClick={c.loadMoreAccounts}>
                      Load more
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Showing {c.visibleAccountsCount} of {c.sortedAccounts.length}
                    </span>
                  </div>
                ) : (
                  c.sortedAccounts.length > 50 && (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      Showing all {c.sortedAccounts.length} accounts
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action bar ------------------------------------------------- */}
      {c.selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-lg rounded-full pl-4 pr-2 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {c.selectedIds.size} selected
          </span>
          <div className="h-5 w-px bg-border" />
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs"
            onClick={c.handleBulkSendOutreach}
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            Send Outreach
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={c.handleBulkMarkReviewed}
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            Mark as Reviewed
          </Button>
          <Popover open={c.bulkFollowUpOpen} onOpenChange={c.setBulkFollowUpOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                Assign Follow-up
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center" side="top">
              <Calendar
                mode="single"
                onSelect={c.handleBulkAssignFollowUp}
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
            onClick={c.clearSelection}
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail panel + modals ------------------------------------------ */}
      {c.selectedAccount && (
        <AccountDetailPanel
          account={c.selectedAccount}
          onClose={() => c.setSelectedAccount(null)}
          onSendOutreach={c.setOutreachAccount}
        />
      )}

      <OutreachModal
        account={c.outreachAccount}
        open={!!c.outreachAccount}
        onClose={() => c.setOutreachAccount(null)}
        onSend={c.handleSendOutreach}
      />
      <OutcomeModal
        account={c.outcomeAccount}
        open={!!c.outcomeAccount}
        onClose={() => c.setOutcomeAccount(null)}
        onSave={c.handleSaveOutcome}
        onSkip={c.handleSkipOutcome}
      />
      <PromptInviteModal
        account={c.promptAccount}
        open={!!c.promptAccount}
        onClose={() => c.setPromptAccount(null)}
      />
      <NextBestAccountModal
        account={c.nextBest.nextBestAccount}
        open={c.nextBest.nextBestOpen}
        mode={c.nextBest.nextBestMode}
        stillSearching={c.nextBest.nextBestStillSearching}
        onContinue={c.nextBest.handleContinue}
        onStop={c.nextBest.stop}
        onRetry={c.nextBest.retry}
        onSwitchRisk={c.nextBest.switchRisk}
        onReturnToQueue={c.nextBest.stop}
      />
      <SnoozeModal
        account={c.snoozeAccount}
        open={!!c.snoozeAccount}
        onClose={() => c.setSnoozeAccount(null)}
        onSnooze={c.handleSnooze}
      />
    </AppLayout>
  );
}
