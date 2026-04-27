import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, CalendarIcon, RefreshCw } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  OutreachOutcome,
  OutreachOutcomeStatus,
  STATUS_OPTIONS,
} from "../types/outcomeTypes";

interface OutcomeModalProps {
  account: Account | null;
  open: boolean;
  onClose: () => void;
  /** May return a Promise — modal awaits it and shows inline retry on rejection. */
  onSave: (account: Account, outcome: OutreachOutcome) => void | Promise<void>;
  onSkip: (account: Account) => void;
}

export function OutcomeModal({ account, open, onClose, onSave, onSkip }: OutcomeModalProps) {
  const [status, setStatus] = useState<OutreachOutcomeStatus>("contacted");
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset whenever a new account flows in
  useEffect(() => {
    if (account) {
      setStatus("contacted");
      setFollowUpDate(undefined);
      setNotes("");
      setSubmitting(false);
      setError(null);
    }
  }, [account?.id]);

  if (!account) return null;

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // Status, followUpDate, notes all stay populated on failure.
      await onSave(account, { status, followUpDate: followUpDate ?? null, notes });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this outcome.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Outreach Sent</DialogTitle>
          <DialogDescription className="text-xs">
            Quick capture for {account.name} — then we'll line up the next account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="outcome-status" className="text-xs font-medium">
              Status
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as OutreachOutcomeStatus)}>
              <SelectTrigger id="outcome-status" className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-sm">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Next follow-up</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start text-left text-sm font-normal",
                    !followUpDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {followUpDate ? format(followUpDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={followUpDate}
                  onSelect={setFollowUpDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outcome-notes" className="text-xs font-medium">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="outcome-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything to remember for next time?"
              className="text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => onSkip(account)}>
            Skip
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { OutreachOutcome, OutreachOutcomeStatus } from "../types/outcomeTypes";
export { STATUS_TO_ACCOUNT_STATUS } from "../types/outcomeTypes";
