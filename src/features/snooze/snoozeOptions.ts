export type SnoozeDuration = "2_days" | "1_week" | "until_renewal";
export type SnoozeReason = "already_contacted" | "not_relevant" | "waiting_on_customer";

export interface SnoozeData {
  until: Date;
  duration: SnoozeDuration;
  reason: SnoozeReason | null;
}

export const DURATION_OPTIONS: {
  value: SnoozeDuration;
  label: string;
  sublabel: string;
}[] = [
  { value: "2_days", label: "Snooze 2 days", sublabel: "Quick check back" },
  { value: "1_week", label: "Snooze 1 week", sublabel: "Give time to react" },
  { value: "until_renewal", label: "Snooze until renewal", sublabel: "~90 days out" },
];

export const REASON_OPTIONS: { value: SnoozeReason; label: string }[] = [
  { value: "already_contacted", label: "Already contacted" },
  { value: "not_relevant", label: "Not relevant" },
  { value: "waiting_on_customer", label: "Waiting on customer" },
];

/** Map a snooze duration to a concrete future Date. */
export function computeSnoozeUntil(duration: SnoozeDuration): Date {
  const now = new Date();
  if (duration === "2_days") return new Date(now.getTime() + 2 * 86400000);
  if (duration === "1_week") return new Date(now.getTime() + 7 * 86400000);
  return new Date(now.getTime() + 90 * 86400000);
}

export const REASON_LABELS: Record<SnoozeReason, string> = {
  already_contacted: "Already contacted",
  not_relevant: "Not relevant",
  waiting_on_customer: "Waiting on customer",
};

export const DURATION_LABELS: Record<SnoozeDuration, string> = {
  "2_days": "2 days",
  "1_week": "1 week",
  until_renewal: "renewal",
};
