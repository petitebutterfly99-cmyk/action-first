// Activity store: Supabase-backed with a localStorage fallback so the UI
// stays responsive offline / when the network blips. Pub/sub layer keeps
// the Activity Log page and any future counters in sync.

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";


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

function loadLocal(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
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

async function hydrateFromCloud() {
  try {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    // RLS scopes results to the current CSM. Replace local cache so
    // entries from a previous user don't leak across sessions.
    entries = (data ?? []).map(rowToEntry);
    try {
      persistLocal(entries);
    } catch {
      /* non-fatal */
    }
    emit();
  } catch {
    // Stay with whatever loadLocal() gave us.
  }
}

function clearStore() {
  entries = [];
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* non-fatal */
    }
  }
  emit();
}

export const activityStore = {
  list(): ActivityEntry[] {
    return entries;
  },
  hydrate: hydrateFromCloud,
  clear: clearStore,
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
    userLabel?: string;
  }) {
    const userLabel = input.userLabel ?? "You";
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
          user_label: userLabel,
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
        user: userLabel,
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
