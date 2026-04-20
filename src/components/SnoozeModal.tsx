import { useEffect, useState } from "react";
import { Account } from "@/data/mockAccounts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SnoozeDuration = "2_days" | "1_week" | "until_renewal";
export type SnoozeReason = "already_contacted" | "not_relevant" | "waiting_on_customer";

export interface SnoozeData {
  until: Date;
  duration: SnoozeDuration;
  reason: SnoozeReason | null;
}

interface SnoozeModalProps {
  account: Account | null;
  open: boolean;
  onClose: () => void;
  onSnooze: (account: Account, data: SnoozeData) => void;
}

const DURATION_OPTIONS: { value: SnoozeDuration; label: string; sublabel: string }[] = [
  { value: "2_days", label: "Snooze 2 days", sublabel: "Quick check back" },
  { value: "1_week", label: "Snooze 1 week", sublabel: "Give time to react" },
  { value: "until_renewal", label: "Snooze until renewal", sublabel: "~90 days out" },
];

const REASON_OPTIONS: { value: SnoozeReason; label: string }[] = [
  { value: "already_contacted", label: "Already contacted" },
  { value: "not_relevant", label: "Not relevant" },
  { value: "waiting_on_customer", label: "Waiting on customer" },
];

function computeSnoozeUntil(duration: SnoozeDuration): Date {
  const now = new Date();
  if (duration === "2_days") return new Date(now.getTime() + 2 * 86400000);
  if (duration === "1_week") return new Date(now.getTime() + 7 * 86400000);
  return new Date(now.getTime() + 90 * 86400000);
}

export function SnoozeModal({ account, open, onClose, onSnooze }: SnoozeModalProps) {
  const [duration, setDuration] = useState<SnoozeDuration>("2_days");
  const [reason, setReason] = useState<SnoozeReason | "">("");

  useEffect(() => {
    if (account) {
      setDuration("2_days");
      setReason("");
    }
  }, [account?.id]);

  if (!account) return null;

  const handleSnooze = () => {
    onSnooze(account, {
      until: computeSnoozeUntil(duration),
      duration,
      reason: (reason || null) as SnoozeReason | null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Snooze {account.name}</DialogTitle>
          <DialogDescription className="text-xs">
            Temporarily hide this account from the queue. It'll come back when the snooze ends.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Snooze for</Label>
            <div className="grid gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const active = duration === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    className={cn(
                      "text-left rounded-md border px-3 py-2 transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted",
                    )}
                  >
                    <div className="text-sm font-medium text-foreground">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.sublabel}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="snooze-reason" className="text-xs font-medium">
              Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select value={reason} onValueChange={(v) => setReason(v as SnoozeReason)}>
              <SelectTrigger id="snooze-reason" className="h-9 text-sm">
                <SelectValue placeholder="Pick a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-sm">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSnooze}>
            Snooze
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
