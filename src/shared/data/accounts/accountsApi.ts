// Cloud-backed account loader + mutator. Maps Supabase rows to the Account
// shape the rest of the app already uses, so nothing downstream needs to change.

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Account } from "./types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type AccountUpdate = Database["public"]["Tables"]["accounts"]["Update"];

function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    daysSinceSignup: row.days_since_signup,
    invitesSent: row.invites_sent,
    activeUsers: row.active_users,
    lastActivityDays: row.last_activity_days,
    risk: row.risk,
    arr: Number(row.arr),
    plan: row.plan,
    status: row.status,
    signupDate: row.signup_date,
    firstTaskCreated: row.first_task_created,
    minutesToFirstTask: row.minutes_to_first_task,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    quote:
      row.quote_text && row.quote_source
        ? { text: row.quote_text, source: row.quote_source }
        : undefined,
    lastOutreachSentAt: row.last_outreach_sent_at,
    lastOutreachSentBy: row.last_outreach_sent_by,
    outreachCount: row.outreach_count ?? 0,
  };
}

function accountUpdateToRow(updates: Partial<Account>): AccountUpdate {
  const map: AccountUpdate = {};
  if (updates.name !== undefined) map.name = updates.name;
  if (updates.daysSinceSignup !== undefined) map.days_since_signup = updates.daysSinceSignup;
  if (updates.invitesSent !== undefined) map.invites_sent = updates.invitesSent;
  if (updates.activeUsers !== undefined) map.active_users = updates.activeUsers;
  if (updates.lastActivityDays !== undefined) map.last_activity_days = updates.lastActivityDays;
  if (updates.risk !== undefined) map.risk = updates.risk;
  if (updates.arr !== undefined) map.arr = updates.arr;
  if (updates.plan !== undefined) map.plan = updates.plan;
  if (updates.status !== undefined) map.status = updates.status;
  if (updates.firstTaskCreated !== undefined) map.first_task_created = updates.firstTaskCreated;
  if (updates.minutesToFirstTask !== undefined)
    map.minutes_to_first_task = updates.minutesToFirstTask;
  if (updates.contactName !== undefined) map.contact_name = updates.contactName;
  if (updates.contactEmail !== undefined) map.contact_email = updates.contactEmail;
  if (updates.lastOutreachSentAt !== undefined)
    map.last_outreach_sent_at = updates.lastOutreachSentAt;
  if (updates.lastOutreachSentBy !== undefined)
    map.last_outreach_sent_by = updates.lastOutreachSentBy;
  if (updates.outreachCount !== undefined) map.outreach_count = updates.outreachCount;
  return map;
}

/**
 * Fetch accounts visible to the current user. RLS scopes results to the
 * accounts where assigned_csm_id = auth.uid().
 */
export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToAccount);
}

export async function updateAccountInDb(
  id: string,
  updates: Partial<Account>,
): Promise<void> {
  const payload = accountUpdateToRow(updates);
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from("accounts").update(payload).eq("id", id);
  if (error) throw error;
}

export async function bulkUpdateAccountsInDb(
  ids: string[],
  updates: Partial<Account>,
): Promise<void> {
  const payload = accountUpdateToRow(updates);
  if (ids.length === 0 || Object.keys(payload).length === 0) return;
  const { error } = await supabase.from("accounts").update(payload).in("id", ids);
  if (error) throw error;
}
