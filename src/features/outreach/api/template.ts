import type { Account } from "@/shared/data/accounts";

/**
 * Always-available default so the textarea is never empty,
 * regardless of AI generation outcome.
 */
export function buildDefaultTemplate(account: Account): string {
  const first = account.contactName?.split(" ")[0];
  const greeting = first ? `Hey ${first}` : "Hey";
  return `${greeting} — most teams see value once they invite a teammate. Want help getting your team set up?`;
}

export const FALLBACK_PLACEHOLDER =
  "Write a short outreach note to help this customer invite a teammate";
