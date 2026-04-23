import { supabase } from "@/integrations/supabase/client";

/**
 * KPI event types — must stay in sync with the `event_type` enum in the DB.
 */
export type EventType =
  | "session_start"
  | "action_committed"
  | "outreach_send_attempt"
  | "outreach_send_success"
  | "outreach_send_failure"
  | "outreach_retry"
  | "ai_suggestion_used"
  | "ai_suggestion_edited"
  | "ai_suggestion_discarded"
  | "filter_applied"
  | "filter_zero_results"
  | "next_account_prompt_shown"
  | "next_account_accepted"
  | "activity_log_write_failed";

/**
 * Action sub-types for `action_committed` events. Matches the activity log
 * action types so we can compute the action mix consistently.
 */
export type CommittedAction =
  | "send_outreach"
  | "prompt_invite"
  | "mark_reviewed"
  | "snooze"
  | "save_outcome";

export interface EventRow {
  id: string;
  user_id: string;
  account_id: string | null;
  event_type: EventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface TrackParams {
  type: EventType;
  accountId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget event write. Never throws — tracking must never block the
 * workflow. Failures are swallowed (and logged once to the console).
 */
export async function trackEvent(params: TrackParams): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return; // anonymous: skip silently
    const { error } = await supabase.from("events").insert([
      {
        user_id: userId,
        account_id: params.accountId ?? null,
        event_type: params.type,
        metadata: (params.metadata ?? {}) as never,
      },
    ]);
    if (error) {
      console.warn("[analytics] trackEvent failed:", error.message);
    }
  } catch (e) {
    console.warn("[analytics] trackEvent threw:", e);
  }
}

/**
 * Pull the current user's events created on or after `sinceISO`.
 * Used by the in-page metrics aggregator. Capped to 1000 rows (Supabase
 * default) which is plenty for a single CSM workday.
 */
export async function fetchEventsSince(sinceISO: string): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("created_at", sinceISO)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[analytics] fetchEventsSince failed:", error.message);
    return [];
  }
  return (data ?? []) as EventRow[];
}

/**
 * Token-overlap similarity (0..1). Used to classify AI suggestion usage as
 * used / edited / discarded with a fuzzy threshold so trivial whitespace or
 * punctuation tweaks still count as "used".
 */
export function similarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
  const ta = norm(a);
  const tb = norm(b);
  if (ta.length === 0 && tb.length === 0) return 1;
  if (ta.length === 0 || tb.length === 0) return 0;
  const setA = new Map<string, number>();
  ta.forEach((t) => setA.set(t, (setA.get(t) ?? 0) + 1));
  let overlap = 0;
  for (const t of tb) {
    const c = setA.get(t) ?? 0;
    if (c > 0) {
      overlap++;
      setA.set(t, c - 1);
    }
  }
  return overlap / Math.max(ta.length, tb.length);
}

export const AI_USED_THRESHOLD = 0.9;

/**
 * Classify how the user treated an AI-generated suggestion based on what
 * was finally sent. `suggested` may be empty (generation failed/timed out),
 * in which case there's no AI suggestion to classify.
 */
export function classifyAiUsage(
  suggested: string,
  sent: string,
): "ai_suggestion_used" | "ai_suggestion_edited" | "ai_suggestion_discarded" | null {
  if (!suggested.trim()) return null;
  const sim = similarity(suggested, sent);
  if (sim >= AI_USED_THRESHOLD) return "ai_suggestion_used";
  if (sim >= 0.3) return "ai_suggestion_edited";
  return "ai_suggestion_discarded";
}
