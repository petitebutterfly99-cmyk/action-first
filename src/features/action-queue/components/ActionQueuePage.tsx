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
} from "@/features/analytics";
import { useMemo } from "react";

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

  return (
    <AppLayout
      title="My Accounts Requiring Attention"
      subtitle="Accounts at risk due to lack of early activation"
    >
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
                title="Couldn't load accounts"
                body="We ran into a problem loading this queue."
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
                {c.visibleAccounts.map((account) => (
                  <ActionQueueRow
                    key={account.id}
                    ref={(el) => (c.cardRefs.current[account.id] = el)}
                    account={account}
                    onSendOutreach={c.setOutreachAccount}
                    onPromptInvite={c.handlePromptInvite}
                    onMarkReviewed={c.handleMarkReviewed}
                    onSelect={c.setSelectedAccount}
                    onSnooze={c.setSnoozeAccount}
                    selected={c.selectedIds.has(account.id)}
                    onToggleSelected={c.toggleSelected}
                    highlight={c.highlightId === account.id}
                    snoozeUntil={c.snoozes[account.id]?.until}
                    followUpDate={c.followUpDates[account.id]}
                  />
                ))}
                {c.hasMoreAccounts && (
                  <div
                    ref={c.queueSentinelRef}
                    className="py-4 text-center text-xs text-muted-foreground"
                  >
                    Loading more accounts…
                  </div>
                )}
                {!c.hasMoreAccounts && c.sortedAccounts.length > 50 && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Showing all {c.sortedAccounts.length} accounts
                  </div>
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
