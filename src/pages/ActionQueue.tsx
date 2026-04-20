import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { AccountCard } from "@/components/AccountCard";
import { AccountDetailPanel } from "@/components/AccountDetailPanel";
import { OutreachModal } from "@/components/OutreachModal";
import { OutcomeModal, OutreachOutcome, STATUS_TO_ACCOUNT_STATUS } from "@/components/OutcomeModal";
import { PromptInviteModal } from "@/components/PromptInviteModal";
import { mockAccounts, Account, AccountStatus, RiskLevel } from "@/data/mockAccounts";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  const [promptAccount, setPromptAccount] = useState<Account | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel[]>(["high", "medium", "low"]);

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
    updateAccount(account.id, { status: "contacted" });
    setOutreachAccount(null);
    toast({ title: "Outreach sent", description: `Message sent to ${account.contactName} at ${account.name}` });
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

          <div className="space-y-3">
            {sortedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onSendOutreach={setOutreachAccount}
                onPromptInvite={setPromptAccount}
                onMarkReviewed={handleMarkReviewed}
                onSelect={setSelectedAccount}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selectedAccount && (
          <AccountDetailPanel
            account={selectedAccount}
            onClose={() => setSelectedAccount(null)}
            onSendOutreach={setOutreachAccount}
          />
        )}
      </div>

      <OutreachModal
        account={outreachAccount}
        open={!!outreachAccount}
        onClose={() => setOutreachAccount(null)}
        onSend={handleSendOutreach}
      />
      <PromptInviteModal
        account={promptAccount}
        open={!!promptAccount}
        onClose={() => setPromptAccount(null)}
      />
    </AppLayout>
  );
}
