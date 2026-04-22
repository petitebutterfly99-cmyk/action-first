import {
  AlertTriangle,
  Clock,
  ListChecks,
  LogIn,
  MousePointer,
  UserPlus,
} from "lucide-react";
import type { Account } from "@/shared/data/accounts";

export type TimelineState = "done" | "missing" | "warning";

export interface TimelineEvent {
  icon: typeof LogIn;
  label: string;
  detail: string;
  day: string;
  state: TimelineState;
}

/**
 * Build the activation timeline from raw account data.
 * Pure function — no React, easy to test.
 */
export function buildTimeline(account: Account): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    icon: LogIn,
    label: "Signed up",
    detail: account.signupDate,
    day: "Day 0",
    state: "done",
  });

  events.push({
    icon: Clock,
    label: "First session",
    detail: "Logged in shortly after signup",
    day: "Day 0",
    state: "done",
  });

  events.push({
    icon: ListChecks,
    label: account.firstTaskCreated ? "First task created" : "No tasks created",
    detail: account.firstTaskCreated
      ? `${account.minutesToFirstTask} min after signup`
      : "User has not created any tasks yet",
    day: account.firstTaskCreated ? "Day 0" : "—",
    state: account.firstTaskCreated ? "done" : "missing",
  });

  events.push({
    icon: UserPlus,
    label: account.invitesSent > 0 ? "Teammate invited" : "No teammates invited",
    detail:
      account.invitesSent > 0
        ? `${account.invitesSent} invite${account.invitesSent > 1 ? "s" : ""} sent · ${account.activeUsers} active user${account.activeUsers > 1 ? "s" : ""}`
        : "Solo workspace — strongest churn signal",
    day: account.invitesSent > 0 ? `Day 1` : "—",
    state: account.invitesSent > 0 ? "done" : "missing",
  });

  // Activity gap detection
  if (account.lastActivityDays >= 2) {
    const gapStart = Math.max(1, account.daysSinceSignup - account.lastActivityDays);
    events.push({
      icon: AlertTriangle,
      label: "Activity gap detected",
      detail: `No activity between Day ${gapStart}–${account.daysSinceSignup}`,
      day: `Day ${gapStart}+`,
      state: "warning",
    });
  } else {
    events.push({
      icon: MousePointer,
      label: "Recent activity",
      detail:
        account.lastActivityDays === 0
          ? "Active today"
          : `Last seen ${account.lastActivityDays}d ago`,
      day: `Day ${account.daysSinceSignup}`,
      state: "done",
    });
  }

  return events;
}

/** Short bullets explaining why an account is at risk. Pure data. */
export function buildInsights(account: Account): string[] {
  const insights: string[] = [];
  if (account.lastActivityDays >= 2) {
    const gapStart = Math.max(1, account.daysSinceSignup - account.lastActivityDays);
    insights.push(`No activity between Day ${gapStart}–${account.daysSinceSignup}`);
  }
  if (account.invitesSent === 0) insights.push("No teammates invited yet");
  if (!account.firstTaskCreated) insights.push("No tasks created");
  return insights;
}
