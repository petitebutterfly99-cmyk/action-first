import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GuidedSuccessModalProps {
  open: boolean;
  hasNext: boolean;
  onNext: () => void;
  onExit: () => void;
}

export function GuidedSuccessModal({
  open,
  hasNext,
  onNext,
  onExit,
}: GuidedSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onExit()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--badge-success-bg))] flex items-center justify-center mb-2">
            <CheckCircle2 className="w-5 h-5 text-[hsl(var(--risk-low))]" />
          </div>
          <DialogTitle className="text-base">First action complete</DialogTitle>
          <DialogDescription className="text-xs">
            You contacted a high-risk account. Continue to the next account to keep
            reducing churn risk.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={onExit}
          >
            Exit guided mode
          </Button>
          <Button size="sm" className="text-xs" onClick={onNext} disabled={!hasNext}>
            {hasNext ? "Next account" : "No more high-risk accounts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
