import type { Account, AccountStatus, RiskLevel } from "@/shared/data/accounts";

export const RISK_ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };

export const PROCESSED_STATUSES: AccountStatus[] = ["contacted", "reviewed", "snoozed"];

/** True if the row is "done" for the day and should sink below actionable rows. */
export function isProcessed(status: AccountStatus): boolean {
  return PROCESSED_STATUSES.includes(status);
}

/**
 * Sort + filter accounts for the queue.
 * - Filter by selected risk levels and status.
 * - Processed rows sink below actionable rows but stay visible.
 * - Then sort by Risk (High → Medium → Healthy).
 * - Then by recency / inactivity (most inactive first).
 */
export function selectQueue(
  accounts: Account[],
  riskFilter: RiskLevel[],
  statusFilter: "all" | AccountStatus,
): Account[] {
  return [...accounts]
    .filter((a) => riskFilter.includes(a.risk))
    .filter((a) => statusFilter === "all" || a.status === statusFilter)
    .sort((a, b) => {
      const aProcessed = isProcessed(a.status) ? 1 : 0;
      const bProcessed = isProcessed(b.status) ? 1 : 0;
      if (aProcessed !== bProcessed) return aProcessed - bProcessed;
      const rd = RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
      if (rd !== 0) return rd;
      return b.lastActivityDays - a.lastActivityDays;
    });
}

export interface RiskCounts {
  high: number;
  medium: number;
  low: number;
}

export function computeRiskCounts(accounts: Account[]): RiskCounts {
  return {
    high: accounts.filter((a) => a.risk === "high").length,
    medium: accounts.filter((a) => a.risk === "medium").length,
    low: accounts.filter((a) => a.risk === "low").length,
  };
}

export interface StatusCounts {
  all: number;
  contacted: number;
  reviewed: number;
  snoozed: number;
  follow_up_needed: number;
  needs_action: number;
}

/** Counts per Queue Status, scoped to currently selected risk filter. */
export function computeStatusCounts(
  accounts: Account[],
  riskFilter: RiskLevel[],
): StatusCounts {
  const inRisk = accounts.filter((a) => riskFilter.includes(a.risk));
  return {
    all: inRisk.length,
    contacted: inRisk.filter((a) => a.status === "contacted").length,
    reviewed: inRisk.filter((a) => a.status === "reviewed").length,
    snoozed: inRisk.filter((a) => a.status === "snoozed").length,
    follow_up_needed: inRisk.filter((a) => a.status === "follow_up_needed").length,
    needs_action: inRisk.filter((a) => a.status === "needs_action").length,
  };
}

/** Pick the next high-risk actionable candidate for the "next best" flow. */
export function pickNextBestCandidate(
  accounts: Account[],
  excludeId: string,
  riskFilter: RiskLevel[],
): Account | undefined {
  return [...accounts]
    .filter(
      (a) =>
        a.id !== excludeId && a.status === "needs_action" && riskFilter.includes(a.risk),
    )
    .sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk])[0];
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  high: "High Risk",
  medium: "Medium Risk",
  low: "Healthy",
};

export const STATUS_LABEL: Record<"all" | AccountStatus, string> = {
  all: "All",
  contacted: "Contacted",
  reviewed: "Reviewed",
  snoozed: "Snoozed",
  follow_up_needed: "Follow-up Needed",
  needs_action: "Needs Action",
};

/** True when the given ISO timestamp falls on the local current date. */
export function isSameLocalDay(iso: string | null | undefined, ref: Date = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

/** Aggregate count of unique accounts whose last_outreach_sent_at is today. */
export function countContactedToday(accounts: Account[], ref: Date = new Date()): number {
  return accounts.reduce(
    (n, a) => (isSameLocalDay(a.lastOutreachSentAt, ref) ? n + 1 : n),
    0,
  );
}
