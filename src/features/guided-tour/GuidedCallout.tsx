import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GuidedCalloutProps {
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
  onExit: () => void;
  stepNumber: number;
  totalSteps: number;
  className?: string;
}

/**
 * Inline coachmark used by the guided tour. Floats just above the row /
 * panel it's anchored to. Always shows an Exit affordance so users are
 * never trapped in the flow.
 */
export function GuidedCallout({
  title,
  body,
  ctaLabel,
  onCta,
  onExit,
  stepNumber,
  totalSteps,
  className,
}: GuidedCalloutProps) {
  return (
    <div
      role="dialog"
      aria-label={title}
      className={cn(
        "rounded-md border border-primary/40 bg-primary/5 shadow-md p-3 flex items-start gap-3",
        "animate-in fade-in slide-in-from-top-2",
        className,
      )}
    >
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Guided · Step {stepNumber} of {totalSteps}
          </span>
        </div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
        <div className="flex items-center gap-2 mt-2.5">
          <Button size="sm" className="h-7 text-xs" onClick={onCta}>
            {ctaLabel}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={onExit}
          >
            Exit guided mode
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit guided mode"
        className="text-muted-foreground hover:text-foreground transition-colors p-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
