import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth";
import { fetchEventsSince, type EventRow, type CommittedAction } from "../api/eventsApi";

const REFRESH_MS = 4000; // near real-time without spamming

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export interface MetricsSummary {
  /** Window start (session start, falling back to start-of-day). */
  windowStartISO: string;

  // Primary KPIs
  /** % of accounts surfaced this session that received an action_committed. */
  actionRate: number | null;
  surfacedCount: number;
  actedCount: number;
  /** Seconds from session_start to first action_committed. */
  timeToFirstActionSec: number | null;
  /** Unique accounts contacted today (today, not just this session). */
  contactedToday: number;

  // Secondary KPIs
  /** % of high-risk accounts acted on today. */
  coverage: number | null;
  highRiskTotal: number;
  highRiskActed: number;
  /** Counts per committed-action type (this session). */
  actionMix: Record<CommittedAction, number>;
  /** Outreach success / attempts. */
  outreachSuccessRate: number | null;
  outreachAttempts: number;
  outreachSuccesses: number;
  outreachFailures: number;
  /** retries / attempts. */
  retryRate: number | null;
  retries: number;
  /** AI suggestion usage breakdown. */
  aiTotal: number;
  aiUsedPct: number | null;
  aiEditedPct: number | null;
  aiDiscardedPct: number | null;
  /** Top filter combinations applied (session). */
  filterCombos: { label: string; count: number }[];
  /** % of next-best prompts that led to another action_committed within 60s. */
  nextBestAcceptanceRate: number | null;
  nextBestPrompts: number;
  nextBestAccepted: number;
  /** % of action_committed events with a paired activity_log_write_failed. */
  activityLogFailureRate: number | null;
}

const EMPTY_MIX: Record<CommittedAction, number> = {
  send_outreach: 0,
  prompt_invite: 0,
  mark_reviewed: 0,
  snooze: 0,
  save_outcome: 0,
};

function aggregate(
  events: EventRow[],
  windowStartISO: string,
  surfacedAccountIds: Set<string>,
  highRiskAccountIds: Set<string>,
): MetricsSummary {
  const sessionStartMs = new Date(windowStartISO).getTime();
  const todayStartMs = new Date(startOfTodayISO()).getTime();

  const sessionEvents = events.filter(
    (e) => new Date(e.created_at).getTime() >= sessionStartMs,
  );
  const todayEvents = events.filter(
    (e) => new Date(e.created_at).getTime() >= todayStartMs,
  );

  const sessionCommits = sessionEvents.filter((e) => e.event_type === "action_committed");
  const actedAccountIds = new Set(
    sessionCommits.map((e) => e.account_id).filter((x): x is string => !!x),
  );
  const actedInSurfaced = [...actedAccountIds].filter((id) => surfacedAccountIds.has(id));
  const actionRate =
    surfacedAccountIds.size > 0 ? actedInSurfaced.length / surfacedAccountIds.size : null;

  const firstCommit = sessionCommits[0];
  const timeToFirstActionSec = firstCommit
    ? Math.max(
        0,
        Math.round(
          (new Date(firstCommit.created_at).getTime() - sessionStartMs) / 1000,
        ),
      )
    : null;

  const contactedTodayIds = new Set(
    todayEvents
      .filter(
        (e) =>
          e.event_type === "action_committed" &&
          (e.metadata as { action?: string })?.action === "send_outreach",
      )
      .map((e) => e.account_id)
      .filter((x): x is string => !!x),
  );

  // Coverage: today, % of high-risk accounts acted on
  const todayActedIds = new Set(
    todayEvents
      .filter((e) => e.event_type === "action_committed")
      .map((e) => e.account_id)
      .filter((x): x is string => !!x),
  );
  const highRiskActed = [...todayActedIds].filter((id) => highRiskAccountIds.has(id));
  const coverage =
    highRiskAccountIds.size > 0 ? highRiskActed.length / highRiskAccountIds.size : null;

  // Action mix
  const actionMix = { ...EMPTY_MIX };
  for (const e of sessionCommits) {
    const a = (e.metadata as { action?: CommittedAction })?.action;
    if (a && a in actionMix) actionMix[a]++;
  }

  // Outreach
  const outreachAttempts = sessionEvents.filter(
    (e) => e.event_type === "outreach_send_attempt",
  ).length;
  const outreachSuccesses = sessionEvents.filter(
    (e) => e.event_type === "outreach_send_success",
  ).length;
  const outreachFailures = sessionEvents.filter(
    (e) => e.event_type === "outreach_send_failure",
  ).length;
  const retries = sessionEvents.filter((e) => e.event_type === "outreach_retry").length;
  const outreachSuccessRate =
    outreachAttempts > 0 ? outreachSuccesses / outreachAttempts : null;
  const retryRate = outreachAttempts > 0 ? retries / outreachAttempts : null;

  // AI suggestion mix
  const aiUsed = sessionEvents.filter((e) => e.event_type === "ai_suggestion_used").length;
  const aiEdited = sessionEvents.filter((e) => e.event_type === "ai_suggestion_edited").length;
  const aiDiscarded = sessionEvents.filter(
    (e) => e.event_type === "ai_suggestion_discarded",
  ).length;
  const aiTotal = aiUsed + aiEdited + aiDiscarded;
  const aiUsedPct = aiTotal > 0 ? aiUsed / aiTotal : null;
  const aiEditedPct = aiTotal > 0 ? aiEdited / aiTotal : null;
  const aiDiscardedPct = aiTotal > 0 ? aiDiscarded / aiTotal : null;

  // Filter combos
  const comboCounts = new Map<string, number>();
  for (const e of sessionEvents.filter((e) => e.event_type === "filter_applied")) {
    const m = e.metadata as { risk?: string[]; status?: string };
    const risk = (m?.risk ?? []).slice().sort().join("+") || "any";
    const status = m?.status ?? "all";
    const key = `risk:${risk} · status:${status}`;
    comboCounts.set(key, (comboCounts.get(key) ?? 0) + 1);
  }
  const filterCombos = [...comboCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Next-best acceptance: prompt_shown followed by an action_committed within 60s
  const prompts = sessionEvents.filter((e) => e.event_type === "next_account_prompt_shown");
  const accepted = sessionEvents.filter((e) => e.event_type === "next_account_accepted");
  const nextBestAcceptanceRate =
    prompts.length > 0 ? accepted.length / prompts.length : null;

  // Activity log failure rate
  const logFailures = sessionEvents.filter(
    (e) => e.event_type === "activity_log_write_failed",
  ).length;
  const activityLogFailureRate =
    sessionCommits.length > 0 ? logFailures / sessionCommits.length : null;

  return {
    windowStartISO,
    actionRate,
    surfacedCount: surfacedAccountIds.size,
    actedCount: actedInSurfaced.length,
    timeToFirstActionSec,
    contactedToday: contactedTodayIds.size,
    coverage,
    highRiskTotal: highRiskAccountIds.size,
    highRiskActed: highRiskActed.length,
    actionMix,
    outreachAttempts,
    outreachSuccesses,
    outreachFailures,
    outreachSuccessRate,
    retries,
    retryRate,
    aiTotal,
    aiUsedPct,
    aiEditedPct,
    aiDiscardedPct,
    filterCombos,
    nextBestPrompts: prompts.length,
    nextBestAccepted: accepted.length,
    nextBestAcceptanceRate,
    activityLogFailureRate,
  };
}

interface UseMetricsArgs {
  sessionStartedISO: string | null;
  surfacedAccountIds: string[];
  highRiskAccountIds: string[];
}

/**
 * Polls the events table on a short cadence and derives all KPIs in one
 * pass. Polling (vs realtime) is fine here — this is per-CSM, low-volume,
 * and we want the workspace to stay responsive even if subscriptions break.
 */
export function useMetrics({
  sessionStartedISO,
  surfacedAccountIds,
  highRiskAccountIds,
}: UseMetricsArgs): MetricsSummary | null {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);

  const surfacedSet = useMemo(() => new Set(surfacedAccountIds), [surfacedAccountIds]);
  const highRiskSet = useMemo(() => new Set(highRiskAccountIds), [highRiskAccountIds]);

  const refresh = useCallback(async () => {
    if (!user) return;
    // Pull from start-of-day so we can compute "today" KPIs as well as session KPIs.
    const since = startOfTodayISO();
    const rows = await fetchEventsSince(since);
    setEvents(rows);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setEvents([]);
      return;
    }
    void refresh();
    const id = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [user, refresh]);

  return useMemo(() => {
    if (!sessionStartedISO) return null;
    return aggregate(events, sessionStartedISO, surfacedSet, highRiskSet);
  }, [events, sessionStartedISO, surfacedSet, highRiskSet]);
}
