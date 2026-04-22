// Cloud-backed account loader + mutator. Maps Supabase rows to the Account
// shape the rest of the app already uses, so nothing downstream needs to change.

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mockAccounts } from "./mockAccounts";
import type { Account } from "./types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];
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
  };
}

function accountToInsert(a: Account): AccountInsert {
  return {
    name: a.name,
    days_since_signup: a.daysSinceSignup,
    invites_sent: a.invitesSent,
    active_users: a.activeUsers,
    last_activity_days: a.lastActivityDays,
    risk: a.risk,
    arr: a.arr,
    plan: a.plan,
    status: a.status,
    signup_date: a.signupDate,
    first_task_created: a.firstTaskCreated,
    minutes_to_first_task: a.minutesToFirstTask,
    contact_name: a.contactName,
    contact_email: a.contactEmail,
    quote_text: a.quote?.text ?? null,
    quote_source: a.quote?.source ?? null,
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
  return map;
}

/**
 * Seed the accounts table on first load. Idempotent: if any row exists we
 * skip. Returns true if a seed actually ran (so the caller can refetch).
 */
async function seedIfEmpty(): Promise<boolean> {
  const { count, error } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) return false;

  const rows = mockAccounts.map(accountToInsert);
  const { error: insertError } = await supabase.from("accounts").insert(rows);
  if (insertError) throw insertError;
  return true;
}

export async function fetchAccounts(): Promise<Account[]> {
  await seedIfEmpty();
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
