import { Clock, MessageCircle, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { MetricsSummary } from "../hooks/useMetrics";

interface KpiRowProps {
  metrics: MetricsSummary | null;
}

function pct(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "—";
  return `${Math.round(v * 100)}%`;
}

function formatTtfa(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function Card({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card min-w-[150px]">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="leading-tight">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card min-w-[150px]">
      <Skeleton className="h-8 w-8 rounded-md" />
      <div className="space-y-1.5">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-3.5 w-12" />
      </div>
    </div>
  );
}

/**
 * Compact KPI row pinned to the top of the Action Queue. Three primary
 * metrics only — the goal is "is the CSM acting?", not "show me a dashboard".
 */
export function KpiRow({ metrics }: KpiRowProps) {
  // Before the first metrics tick lands, render skeleton tiles so the layout
  // is stable and there's no flash of "—" placeholders during initial load.
  if (!metrics) {
    return (
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <Card
        icon={<Target className="h-4 w-4" />}
        label="Action Rate"
        value={pct(metrics.actionRate)}
        sub={`${metrics.actedCount}/${metrics.surfacedCount} surfaced`}
      />
      <Card
        icon={<Clock className="h-4 w-4" />}
        label="Time to First Action"
        value={formatTtfa(metrics.timeToFirstActionSec)}
        sub="this session"
      />
      <Card
        icon={<MessageCircle className="h-4 w-4" />}
        label="Contacted Today"
        value={String(metrics.contactedToday)}
        sub="unique accounts"
      />
    </div>
  );
}
