import type { AccountStatus } from "@/shared/data/accounts";

export type OutreachOutcomeStatus = "contacted" | "no_response" | "follow_up_needed";

export interface OutreachOutcome {
  status: OutreachOutcomeStatus;
  followUpDate: Date | null;
  notes: string;
}

export const STATUS_OPTIONS: {
  value: OutreachOutcomeStatus;
  label: string;
  mapsTo: AccountStatus | null;
}[] = [
  { value: "contacted", label: "Contacted", mapsTo: "contacted" },
  { value: "no_response", label: "No response", mapsTo: null },
  { value: "follow_up_needed", label: "Follow-up needed", mapsTo: "contacted" },
];

export const STATUS_TO_ACCOUNT_STATUS: Record<
  OutreachOutcomeStatus,
  AccountStatus | null
> = {
  contacted: "contacted",
  no_response: null,
  follow_up_needed: "contacted",
};
