import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { MetricsSummary } from "../hooks/useMetrics";

interface CsmPerformancePanelProps {
  metrics: MetricsSummary | null;
  /** Optional controlled-open state (used by the guided tour). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional ref forwarded to the trigger row (for guided-tour anchoring). */
  triggerRef?: React.Ref<HTMLButtonElement>;
}

const ACTION_LABEL: Record<keyof MetricsSummary["actionMix"], string> = {
  send_outreach: "Send Outreach",
  prompt_invite: "Prompt Invite",
  snooze: "Snooze",
  mark_reviewed: "Reviewed",
  save_outcome: "Log Outcome",
};

function pct(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "—";
  return `${Math.round(v * 100)}%`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/**
 * Secondary KPIs — collapsed by default so the Action Queue stays focused.
 * Open it when you want a self-check on coverage, action mix, AI usage,
 * filter habits, momentum-modal acceptance, and log reliability.
 */
export function CsmPerformancePanel({ metrics, open, onOpenChange, triggerRef }: CsmPerformancePanelProps) {
  const mixTotal = metrics
    ? Object.values(metrics.actionMix).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <Collapsible className="mb-4" open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        ref={triggerRef}
        className={cn(
          "group flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
        )}
      >
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
        CSM Performance
        {!metrics && (
          <span className="text-[10px] font-normal text-muted-foreground/80">
            · Take an action to populate metrics
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <Stat
            label="Coverage (high-risk)"
            value={pct(metrics?.coverage ?? null)}
            sub={
              metrics
                ? `${metrics.highRiskActed}/${metrics.highRiskTotal} acted today`
                : undefined
            }
          />
          <Stat
            label="Outreach Success"
            value={pct(metrics?.outreachSuccessRate ?? null)}
            sub={
              metrics
                ? `${metrics.outreachSuccesses}/${metrics.outreachAttempts} attempts`
                : undefined
            }
          />
          <Stat
            label="Retry Rate"
            value={pct(metrics?.retryRate ?? null)}
            sub={metrics ? `${metrics.retries} retries` : undefined}
          />
          <Stat
            label="Next-Best Accepted"
            value={pct(metrics?.nextBestAcceptanceRate ?? null)}
            sub={
              metrics
                ? `${metrics.nextBestAccepted}/${metrics.nextBestPrompts} prompts`
                : undefined
            }
          />
          <Stat
            label="Activity Log Failures"
            value={pct(metrics?.activityLogFailureRate ?? null)}
            sub="of committed actions"
          />
          <Stat
            label="AI Suggestion · Used"
            value={pct(metrics?.aiUsedPct ?? null)}
            sub={metrics ? `${metrics.aiTotal} sends classified` : undefined}
          />
          <Stat
            label="AI Suggestion · Edited"
            value={pct(metrics?.aiEditedPct ?? null)}
          />
          <Stat
            label="AI Suggestion · Discarded"
            value={pct(metrics?.aiDiscardedPct ?? null)}
          />
        </div>

        {/* Action mix bar */}
        <div className="mt-3 rounded-md border border-border bg-card p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Action Mix (this session)
          </div>
          {mixTotal === 0 ? (
            <div className="text-xs text-muted-foreground">No actions yet.</div>
          ) : (
            <div className="space-y-1.5">
              {(Object.keys(ACTION_LABEL) as (keyof MetricsSummary["actionMix"])[]).map(
                (k) => {
                  const count = metrics?.actionMix[k] ?? 0;
                  const pctVal = mixTotal > 0 ? count / mixTotal : 0;
                  return (
                    <div key={k} className="flex items-center gap-3 text-xs">
                      <div className="w-28 text-muted-foreground">{ACTION_LABEL[k]}</div>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.round(pctVal * 100)}%` }}
                        />
                      </div>
                      <div className="w-16 text-right text-muted-foreground tabular-nums">
                        {count} · {Math.round(pctVal * 100)}%
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* Filter usage */}
        <div className="mt-3 rounded-md border border-border bg-card p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Filter Usage (this session)
          </div>
          {!metrics || metrics.filterCombos.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No filter changes yet.
            </div>
          ) : (
            <ul className="space-y-1 text-xs">
              {metrics.filterCombos.map((c) => (
                <li
                  key={c.label}
                  className="flex items-center justify-between text-muted-foreground"
                >
                  <span className="truncate pr-2">{c.label}</span>
                  <span className="tabular-nums">×{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
