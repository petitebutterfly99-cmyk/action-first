import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { Account } from "@/shared/data/accounts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SnoozeData,
  SnoozeDuration,
  SnoozeReason,
  DURATION_OPTIONS,
  REASON_OPTIONS,
  computeSnoozeUntil,
} from "../api/snoozeOptions";

interface SnoozeModalProps {
  account: Account | null;
  open: boolean;
  onClose: () => void;
  /** May return a Promise — the modal awaits it before closing and shows a retry on rejection. */
  onSnooze: (account: Account, data: SnoozeData) => void | Promise<void>;
}

export function SnoozeModal({ account, open, onClose, onSnooze }: SnoozeModalProps) {
  const [duration, setDuration] = useState<SnoozeDuration>("2_days");
  const [reason, setReason] = useState<SnoozeReason | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setDuration("2_days");
      setReason("");
      setSubmitting(false);
      setError(null);
    }
  }, [account?.id]);

  if (!account) return null;

  const handleSnooze = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // Field values stay populated; we only close on success.
      await onSnooze(account, {
        until: computeSnoozeUntil(duration),
        duration,
        reason: (reason || null) as SnoozeReason | null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't snooze this account.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) return;
        if (submitting) return; // never close mid-submit
        onClose();
      }}
    >
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

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-[hsl(var(--risk-high))]/40 bg-[hsl(var(--badge-urgent-bg))]/40 px-3 py-2 text-xs text-foreground"
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-[hsl(var(--risk-high))] shrink-0" />
              <div className="flex-1">{error}</div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2 -mt-0.5 shrink-0"
                onClick={handleSnooze}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSnooze} disabled={submitting}>
            {submitting ? "Snoozing…" : "Snooze"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { SnoozeData, SnoozeDuration, SnoozeReason } from "../api/snoozeOptions";
