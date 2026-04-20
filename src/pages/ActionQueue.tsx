import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, MessageCircle, CheckCircle, X } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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
 * first; only logs if the action succeeds. If logging itself throws, we surface
 * a non-blocking warning toast — the action itself is preserved.
 */
function safeLog(
  toast: ReturnType<typeof useToast>["toast"],
  action: () => void,
  entry: Parameters<typeof activityStore.log>[0],
) {
  try {
    action();
  } catch (e) {
    // Action failed — do not log.
    throw e;
  }
  try {
    activityStore.log(entry);
  } catch {
    toast({
      title: "Heads up",
      description: "Action completed, but Activity Log could not be updated.",
      variant: "destructive",
    });
  }
}

export default function ActionQueuePage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [outreachAccount, setOutreachAccount] = useState<Account | null>(null);
  const [outcomeAccount, setOutcomeAccount] = useState<Account | null>(null);
  const [promptAccount, setPromptAccount] = useState<Account | null>(null);
  const [nextBestAccount, setNextBestAccount] = useState<Account | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel[]>(["high", "medium", "low"]);
  const [outcomes, setOutcomes] = useState<Record<string, OutreachOutcome>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [followUpDates, setFollowUpDates] = useState<Record<string, Date>>({});
  const [bulkFollowUpOpen, setBulkFollowUpOpen] = useState(false);
  const [snoozeAccount, setSnoozeAccount] = useState<Account | null>(null);
  const [snoozes, setSnoozes] = useState<Record<string, SnoozeData>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
    setAccounts((prev) =>
      prev.map((a) => (ids.includes(a.id) ? { ...a, status: "follow_up_needed" as AccountStatus } : a)),
    );
    try {
      activityStore.log({
        action: `Assigned follow-up to ${ids.length} accounts for ${format(date, "PPP")}`,
        type: "save_outcome",
        account: targets.map((t) => t.name).join(", "),
      });
    } catch {
      toast({ title: "Heads up", description: "Action completed, but Activity Log could not be updated.", variant: "destructive" });
    }
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
      .sort((a, b) => {
        const sd = statusOrder[a.status] - statusOrder[b.status];
        if (sd !== 0) return sd;
        return riskOrder[a.risk] - riskOrder[b.risk];
      });
  }, [accounts, riskFilter]);

  const snoozedCount = accounts.filter((a) => a.status === "snoozed").length;
  const needsActionCount = accounts.filter((a) => a.status === "needs_action" && a.risk !== "low").length;

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    if (selectedAccount?.id === id) {
      setSelectedAccount((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  // Deep-link focus from /accounts → /?focus=<id>
  useEffect(() => {
    const focusId = searchParams.get("focus");
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
    // Make sure the row is visible regardless of current filter.
    if (!riskFilter.includes(target.risk)) {
      setRiskFilter((prev) => Array.from(new Set([...prev, target.risk])) as RiskLevel[]);
    }
    setHighlightId(focusId);
    // Scroll once the row is rendered.
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
  }, [searchParams.get("focus")]);

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

  const advanceToNextBestAccount = (justHandledId: string) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    const candidate = [...accounts]
      .filter((a) => a.id !== justHandledId && a.status === "needs_action" && riskFilter.includes(a.risk))
      .sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])[0];
    if (candidate) {
      setSelectedAccount(null);
      setNextBestAccount(candidate);
    } else {
      setSelectedAccount(null);
      toast({ title: "Queue clear", description: "No more accounts need action right now." });
    }
  };

  const handleContinueNextBest = (account: Account) => {
    setNextBestAccount(null);
    setSelectedAccount(account);
  };

  const handleStopNextBest = () => {
    setNextBestAccount(null);
    toast({ title: "Stopped for now", description: "Pick up where you left off anytime." });
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
      () => updateAccount(account.id, { status: "reviewed" }),
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
    setPromptAccount(account);
    try {
      activityStore.log({
        action: "Sent invite prompt",
        type: "prompt_invite",
        account: account.name,
        accountId: account.id,
      });
    } catch {
      toast({ title: "Heads up", description: "Action completed, but Activity Log could not be updated.", variant: "destructive" });
    }
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
            {sortedAccounts.map((account) => (
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
            ))}
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
        open={!!nextBestAccount}
        onContinue={handleContinueNextBest}
        onStop={handleStopNextBest}
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
