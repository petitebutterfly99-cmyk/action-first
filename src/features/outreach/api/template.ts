import type { Account } from "@/shared/data/accounts";
import { supabase } from "@/integrations/supabase/client";

/**
 * Synchronous fallback so the textarea is never empty even if the network
 * is offline or the user has no saved templates yet.
 */
export function buildDefaultTemplate(account: Account): string {
  const first = account.contactName?.split(" ")[0];
  const greeting = first ? `Hey ${first}` : "Hey";
  return `${greeting} — most teams see value once they invite a teammate. Want help getting your team set up?`;
}

export const FALLBACK_PLACEHOLDER =
  "Write a short outreach note to help this customer invite a teammate";

/**
 * Async resolver: prefers the user's `is_default` outreach_templates row,
 * falling back to `buildDefaultTemplate` on miss/error so the UI never blocks.
 */
export async function loadDefaultTemplate(account: Account): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("outreach_templates")
      .select("body")
      .eq("is_default", true)
      .maybeSingle();
    if (error || !data?.body) return buildDefaultTemplate(account);
    const first = account.contactName?.split(" ")[0] ?? "there";
    return data.body.replace(/\{first_name\}/gi, first);
  } catch {
    return buildDefaultTemplate(account);
  }
}
