export type RiskLevel = "high" | "medium" | "low";
export type AccountStatus =
  | "needs_action"
  | "contacted"
  | "reviewed"
  | "snoozed"
  | "follow_up_needed";

export interface Account {
  id: string;
  name: string;
  daysSinceSignup: number;
  invitesSent: number;
  activeUsers: number;
  lastActivityDays: number;
  risk: RiskLevel;
  arr: number;
  plan: string;
  status: AccountStatus;
  signupDate: string;
  firstTaskCreated: boolean;
  minutesToFirstTask: number | null;
  contactName: string;
  contactEmail: string;
  quote?: { text: string; source: string };
  /** ISO timestamp of the most recent successful outreach. */
  lastOutreachSentAt?: string | null;
  lastOutreachSentBy?: string | null;
  outreachCount?: number;
}
