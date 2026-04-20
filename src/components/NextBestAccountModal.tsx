import { Account } from "@/data/mockAccounts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, AlertTriangle } from "lucide-react";

interface NextBestAccountModalProps {
  account: Account | null;
  open: boolean;
  onContinue: (account: Account) => void;
  onStop: () => void;
}

function riskReason(account: Account): string {
  if (account.invitesSent === 0)
    return `No teammates invited after ${account.daysSinceSignup} day${account.daysSinceSignup > 1 ? "s" : ""}`;
  if (account.lastActivityDays >= 2)
    return `No activity in ${account.lastActivityDays} day${account.lastActivityDays > 1 ? "s" : ""}`;
  if (!account.firstTaskCreated) return "No tasks created since signup";
  return "Showing low activation signals";
}

export function NextBestAccountModal({ account, open, onContinue, onStop }: NextBestAccountModalProps) {
  if (!account) return null;

  const riskLabel =
    account.risk === "high" ? "High Risk" : account.risk === "medium" ? "Medium Risk" : "Healthy";
  const riskClass =
    account.risk === "high"
      ? "bg-[hsl(var(--badge-urgent-bg))] text-[hsl(var(--badge-urgent-fg))]"
      : account.risk === "medium"
        ? "bg-[hsl(var(--badge-warning-bg))] text-[hsl(var(--badge-warning-fg))]"
        : "bg-[hsl(var(--badge-success-bg))] text-[hsl(var(--badge-success-fg))]";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onStop()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base">Next high-risk account ready</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Keep the momentum going — one more intervention can save this account.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-sm text-foreground truncate">{account.name}</div>
              <div className="text-xs text-muted-foreground">
                {account.contactName} · {account.plan} · ${(account.arr / 1000).toFixed(0)}k ARR
              </div>
            </div>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${riskClass}`}>
              {riskLabel}
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs text-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--risk-high))] mt-0.5 shrink-0" />
            <span>{riskReason(account)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onStop}>
            Stop for now
          </Button>
          <Button size="sm" onClick={() => onContinue(account)}>
            Continue
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
