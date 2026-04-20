// Lightweight in-memory + localStorage activity store with a pub/sub layer
// so any screen (Activity Log, header counters, etc.) can subscribe and stay
// in sync after Action Queue actions.

import { activityLog as seedLog } from "./mockAccounts";

export type ActivityActionType =
  | "send_outreach"
  | "prompt_invite"
  | "mark_reviewed"
  | "snooze"
  | "save_outcome";

export interface ActivityEntry {
  id: string;
  action: string; // human-readable label e.g. "Sent outreach"
  type: ActivityActionType | "seed";
  account: string;
  accountId?: string;
  user: string;
  timestampISO: string;
  timestamp: string; // human-readable ("2 hours ago", or "Just now")
  note?: string;
}

const CURRENT_USER = "You";
const STORAGE_KEY = "csm.activityLog.v1";

function seedEntries(): ActivityEntry[] {
  return seedLog.map((e) => ({
    id: e.id,
    action: e.action,
    type: "seed",
    account: e.account,
    user: e.user,
    timestamp: e.timestamp,
    timestampISO: new Date().toISOString(),
  }));
}

function load(): ActivityEntry[] {
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

function persist(entries: ActivityEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Surface to caller via thrown error so the UI can warn.
    throw new Error("activity-log-persist-failed");
  }
}

let entries: ActivityEntry[] = load();
const listeners = new Set<(e: ActivityEntry[]) => void>();

function emit() {
  listeners.forEach((l) => l(entries));
}

export const activityStore = {
  list(): ActivityEntry[] {
    return entries;
  },
  subscribe(listener: (e: ActivityEntry[]) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /**
   * Append an entry. Throws if persistence fails. The in-memory list is only
   * updated AFTER persistence succeeds, so subscribers never see a
   * provisional entry that might disappear on retry.
   */
  log(input: {
    action: string;
    type: ActivityActionType;
    account: string;
    accountId?: string;
    note?: string;
  }) {
    const entry: ActivityEntry = {
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
    const next = [entry, ...entries];
    persist(next); // may throw -> caller warns; entries unchanged
    entries = next;
    emit();
    return entry;
  },
};
