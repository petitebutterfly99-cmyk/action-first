// Activity store: Supabase-backed with a localStorage fallback so the UI
// stays responsive offline / when the network blips. Pub/sub layer keeps
// the Activity Log page and any future counters in sync.

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { seedActivityLog } from "@/shared/data/accounts";

export type ActivityActionType =
  | "send_outreach"
  | "prompt_invite"
  | "mark_reviewed"
  | "snooze"
  | "save_outcome";

export interface ActivityEntry {
  id: string;
  action: string;
  type: ActivityActionType | "seed";
  account: string;
  accountId?: string;
  user: string;
  timestampISO: string;
  timestamp: string;
  note?: string;
}

type ActivityRow = Database["public"]["Tables"]["activity_log"]["Row"];

const CURRENT_USER = "You";
const STORAGE_KEY = "csm.activityLog.v1";

function rowToEntry(row: ActivityRow): ActivityEntry {
  const iso = row.created_at;
  return {
    id: row.id,
    action: row.action,
    type: row.type,
    account: row.account_name,
    accountId: row.account_id ?? undefined,
    user: row.user_label,
    note: row.note ?? undefined,
    timestampISO: iso,
    timestamp: humanize(iso),
  };
}

function humanize(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} minute${min > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function seedEntries(): ActivityEntry[] {
  return seedActivityLog.map((e) => ({
    id: e.id,
    action: e.action,
    type: "seed",
    account: e.account,
    user: e.user,
    timestamp: e.timestamp,
    timestampISO: new Date().toISOString(),
  }));
}

function loadLocal(): ActivityEntry[] {
  if (typeof window === "undefined") return seedEntries();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedEntries();
    const parsed = JSON.parse(raw) as ActivityEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedEntries();
    return parsed;
  } catch {
    return seedEntries();
  }
}

function persistLocal(next: ActivityEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error("activity-log-persist-failed");
  }
}

let entries: ActivityEntry[] = loadLocal();
const listeners = new Set<(e: ActivityEntry[]) => void>();

function emit() {
  listeners.forEach((l) => l(entries));
}

// Background hydrate from Supabase on first import.
(async () => {
  try {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    if (data && data.length > 0) {
      entries = data.map(rowToEntry);
      persistLocal(entries);
      emit();
    }
  } catch {
    // Fall back to whatever loadLocal() gave us — UI stays usable.
  }
})();

export const activityStore = {
  list(): ActivityEntry[] {
    return entries;
  },
  subscribe(listener: (e: ActivityEntry[]) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /**
   * Append an entry. Tries Supabase first; on success uses the DB-issued id
   * and timestamp. On failure, falls back to a local entry and persists to
   * localStorage (throws if even that fails so safeLog can warn the user).
   */
  async log(input: {
    action: string;
    type: ActivityActionType;
    account: string;
    accountId?: string;
    note?: string;
  }) {
    let entry: ActivityEntry;
    try {
      const { data, error } = await supabase
        .from("activity_log")
        .insert({
          action: input.action,
          type: input.type,
          account_name: input.account,
          account_id: input.accountId ?? null,
          note: input.note ?? null,
          user_label: CURRENT_USER,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("no-data");
      entry = rowToEntry(data);
    } catch {
      entry = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        action: input.action,
        type: input.type,
        account: input.account,
        accountId: input.accountId,
        note: input.note,
        user: CURRENT_USER,
        timestamp: "Just now",
        timestampISO: new Date().toISOString(),
      };
    }

    const next = [entry, ...entries];
    persistLocal(next); // throws -> caller warns; entries unchanged
    entries = next;
    emit();
    return entry;
  },
};
