import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, MessageCircle, CheckCircle, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { AccountCard } from "@/components/AccountCard";
import { AccountDetailPanel } from "@/components/AccountDetailPanel";
import { OutreachModal } from "@/components/OutreachModal";
import { OutcomeModal, OutreachOutcome, STATUS_TO_ACCOUNT_STATUS } from "@/components/OutcomeModal";
import { PromptInviteModal } from "@/components/PromptInviteModal";
import { mockAccounts, Account, AccountStatus, RiskLevel } from "@/data/mockAccounts";
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

export default function ActionQueuePage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [outreachAccount, setOutreachAccount] = useState<Account | null>(null);
  const [outcomeAccount, setOutcomeAccount] = useState<Account | null>(null);
  const [promptAccount, setPromptAccount] = useState<Account | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel[]>(["high", "medium", "low"]);
  const [outcomes, setOutcomes] = useState<Record<string, OutreachOutcome>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [followUpDates, setFollowUpDates] = useState<Record<string, Date>>({});
  const [bulkFollowUpOpen, setBulkFollowUpOpen] = useState(false);

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
    const count = selectedIds.size;
    applyBulk(() => ({ status: "contacted" as AccountStatus }));
    toast({ title: "Outreach sent", description: `Sent to ${count} account${count > 1 ? "s" : ""}.` });
    clearSelection();
  };

  const handleBulkMarkReviewed = () => {
    const count = selectedIds.size;
    applyBulk(() => ({ status: "reviewed" as AccountStatus }));
    toast({ title: "Marked as reviewed", description: `${count} account${count > 1 ? "s" : ""} marked as reviewed.` });
    clearSelection();
  };

  const handleBulkAssignFollowUp = (date: Date | undefined) => {
    if (!date) return;
    const ids = Array.from(selectedIds);
    setFollowUpDates((prev) => {
      const next = { ...prev };
      ids.forEach((id) => (next[id] = date));
      return next;
    });
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
    const statusOrder: Record<AccountStatus, number> = { needs_action: 0, contacted: 1, reviewed: 2 };
    return [...accounts]
      .filter((a) => riskFilter.includes(a.risk))
      .sort((a, b) => {
        const sd = statusOrder[a.status] - statusOrder[b.status];
        if (sd !== 0) return sd;
        return riskOrder[a.risk] - riskOrder[b.risk];
      });
  }, [accounts, riskFilter]);

  const needsActionCount = accounts.filter((a) => a.status === "needs_action" && a.risk !== "low").length;

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    if (selectedAccount?.id === id) {
      setSelectedAccount((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const handleSendOutreach = (account: Account, _message: string) => {
    setOutreachAccount(null);
    toast({ title: "Outreach sent", description: `Message sent to ${account.contactName} at ${account.name}` });
    // Immediately chain into outcome capture — keep CSM in the workflow.
    setOutcomeAccount(account);
  };

  const advanceToNextBestAccount = (justHandledId: string) => {
    // Find the highest-priority remaining account that still needs action.
    const riskOrder = { high: 0, medium: 1, low: 2 };
    const candidate = [...accounts]
      .filter((a) => a.id !== justHandledId && a.status === "needs_action" && riskFilter.includes(a.risk))
      .sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])[0];
    if (candidate) {
      setSelectedAccount(candidate);
      toast({ title: "Next best account", description: `${candidate.name} is up next.` });
    } else {
      setSelectedAccount(null);
      toast({ title: "Queue clear", description: "No more accounts need action right now." });
    }
  };

  const handleSaveOutcome = (account: Account, outcome: OutreachOutcome) => {
    setOutcomes((prev) => ({ ...prev, [account.id]: outcome }));
    const mapped = STATUS_TO_ACCOUNT_STATUS[outcome.status];
    if (mapped) updateAccount(account.id, { status: mapped });
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
    // Even on skip, the outreach was sent — reflect that on the account.
    updateAccount(account.id, { status: "contacted" });
    setOutcomeAccount(null);
    advanceToNextBestAccount(account.id);
  };

  const handleMarkReviewed = (account: Account) => {
    updateAccount(account.id, { status: "reviewed" });
    toast({ title: "Marked as reviewed", description: `${account.name} marked as reviewed` });
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
          </div>

          <div className="space-y-3 pb-24">
            {sortedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onSendOutreach={setOutreachAccount}
                onPromptInvite={setPromptAccount}
                onMarkReviewed={handleMarkReviewed}
                onSelect={setSelectedAccount}
                selected={selectedIds.has(account.id)}
                onToggleSelected={toggleSelected}
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
    </AppLayout>
  );
}
