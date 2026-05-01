import { ArrowRight, ShieldAlert, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { forwardRef } from "react";

interface ActionQueueHeroProps {
  highRiskCount: number;
  hasHighestRisk: boolean;
  guidedActive: boolean;
  onStartHighest: () => void;
  onToggleGuided: () => void;
  /** Ref forwarded to the primary CTA button (used by the guided tour). */
  ctaRef?: React.Ref<HTMLButtonElement>;
  /** When false, hides the guided tour entry buttons (Start / Guide me). */
  showGuidedButtons?: boolean;
}

/**
 * Compact hero/intro that explains the queue's purpose in the first
 * five seconds and offers a single primary action: start with the
 * highest-risk account.
 */
export function ActionQueueHero({
  highRiskCount,
  hasHighestRisk,
  guidedActive,
  onStartHighest,
  onToggleGuided,
  ctaRef,
}: ActionQueueHeroProps) {
  return (
    <section
      aria-labelledby="action-queue-hero-title"
      className="mb-4 rounded-lg border border-border bg-gradient-to-br from-primary/5 via-background to-background p-4 sm:p-5"
    >
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex w-9 h-9 rounded-md bg-[hsl(var(--badge-urgent-bg))] items-center justify-center shrink-0 border border-[hsl(var(--risk-high))]/30">
          <ShieldAlert className="w-5 h-5 text-[hsl(var(--risk-high))]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id="action-queue-hero-title"
            className="text-base sm:text-lg font-semibold text-foreground"
          >
            These accounts are at risk of churning
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Start by taking action on accounts that have not invited teammates
            within 3–5 days of signup.
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
            Early team activation is one of the strongest signals of retention.
            This queue helps you intervene before accounts ghost.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button
              ref={ctaRef}
              size="sm"
              className="h-8 text-xs"
              onClick={onStartHighest}
              disabled={!hasHighestRisk}
              title={
                hasHighestRisk
                  ? undefined
                  : "No high-risk accounts in your queue right now"
              }
            >
              Start with highest-risk account
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
            <Button
              size="sm"
              variant={guidedActive ? "outline" : "ghost"}
              className="h-8 text-xs"
              onClick={onToggleGuided}
            >
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              {guidedActive ? "Exit guided mode" : "Guide me"}
            </Button>
            {highRiskCount > 0 && (
              <span className="text-[11px] text-muted-foreground ml-1">
                {highRiskCount} high-risk account{highRiskCount === 1 ? "" : "s"}{" "}
                waiting
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
