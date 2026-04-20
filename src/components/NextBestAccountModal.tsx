import { Account, RiskLevel } from "@/data/mockAccounts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, AlertTriangle, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export type NextBestMode = "ready" | "loading" | "done" | "error";

interface NextBestAccountModalProps {
  account: Account | null;
  open: boolean;
  mode?: NextBestMode;
  stillSearching?: boolean;
  onContinue: (account: Account) => void;
  onStop: () => void;
  onRetry?: () => void;
  onSwitchRisk?: (risk: RiskLevel) => void;
  onReturnToQueue?: () => void;
}

function riskReason(account: Account): string {
  if (account.invitesSent === 0)
    return `No teammates invited after ${account.daysSinceSignup} day${account.daysSinceSignup > 1 ? "s" : ""}`;
  if (account.lastActivityDays >= 2)
    return `No activity in ${account.lastActivityDays} day${account.lastActivityDays > 1 ? "s" : ""}`;
  if (!account.firstTaskCreated) return "No tasks created since signup";
  return "Showing low activation signals";
}

export function NextBestAccountModal({
  account,
  open,
  mode = "ready",
  stillSearching = false,
  onContinue,
  onStop,
  onRetry,
  onSwitchRisk,
  onReturnToQueue,
}: NextBestAccountModalProps) {
  // Loading state ------------------------------------------------------------
  if (mode === "loading") {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onStop()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <DialogTitle className="text-base">
                {stillSearching ? "Still finding the next account…" : "Loading next account…"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Keeping the momentum going.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3 animate-pulse">
            <div className="h-4 w-2/3 bg-muted rounded" />
            <div className="h-3 w-1/2 bg-muted rounded" />
            <div className="h-3 w-3/4 bg-muted rounded" />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={onStop}>
              Stop for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Done state --------------------------------------------------------------
  if (mode === "done") {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onStop()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--risk-low))]" />
              <DialogTitle className="text-base">You're done for now</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              There are no more accounts left in this queue. You've handled all accounts in the current view.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[hsl(var(--risk-low))]/30 bg-[hsl(var(--badge-success-bg))] p-4 text-xs text-[hsl(var(--badge-success-fg))]">
            Nice work — all accounts in this queue have been handled.
          </div>
          <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onSwitchRisk?.("medium")}>
              View Medium Risk
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSwitchRisk?.("low")}>
              View Healthy
            </Button>
            <Button size="sm" onClick={onReturnToQueue ?? onStop}>
              Return to Action Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state -------------------------------------------------------------
  if (mode === "error") {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onStop()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[hsl(var(--risk-high))]" />
              <DialogTitle className="text-base">Couldn't load the next account</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Your last action was saved, but we couldn't load the next item in the queue.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--risk-low))]" />
            Last action saved successfully.
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={onReturnToQueue ?? onStop}>
              Return to Action Queue
            </Button>
            <Button size="sm" onClick={onRetry}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Ready state (default) ---------------------------------------------------
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
