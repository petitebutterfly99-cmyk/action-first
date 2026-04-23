import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth";
import { trackEvent } from "../api/eventsApi";

const SESSION_KEY = "csm.analytics.session.v1";
const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

interface StoredSession {
  id: string;
  userId: string;
  startedAtISO: string;
  lastActivityISO: string;
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeSession(s: StoredSession) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* swallow */
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* swallow */
  }
}

/**
 * Manages the CSM's analytics session. A new session is started when:
 *  - the user signs in, OR
 *  - the Action Queue mounts and there's no live session, OR
 *  - the previous session timed out (>30min of no activity).
 *
 * Mouse / keyboard / scroll touches the lastActivity timestamp; we don't
 * fire any events on those. Only meaningful events extend the session.
 *
 * `sessionStartedISO` (returned) is the timestamp the metrics aggregator
 * uses as its lower bound for "this session" KPIs.
 */
export function useSession(): { sessionStartedISO: string | null } {
  const { user } = useAuth();
  const startedRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      // Logout — end current session
      sessionIdRef.current = null;
      startedRef.current = null;
      clearSession();
      return;
    }

    const existing = readSession();
    const now = new Date();
    const fresh =
      !existing ||
      existing.userId !== user.id ||
      now.getTime() - new Date(existing.lastActivityISO).getTime() > INACTIVITY_MS;

    if (fresh) {
      const id = newSessionId();
      const startedAtISO = now.toISOString();
      const next: StoredSession = {
        id,
        userId: user.id,
        startedAtISO,
        lastActivityISO: startedAtISO,
      };
      writeSession(next);
      sessionIdRef.current = id;
      startedRef.current = startedAtISO;
      void trackEvent({
        type: "session_start",
        metadata: { session_id: id },
      });
    } else {
      sessionIdRef.current = existing!.id;
      startedRef.current = existing!.startedAtISO;
      // Refresh activity on mount.
      writeSession({ ...existing!, lastActivityISO: now.toISOString() });
    }

    // Activity heartbeat — extends the session window without writing events.
    const onActivity = () => {
      const s = readSession();
      if (!s || s.userId !== user.id) return;
      writeSession({ ...s, lastActivityISO: new Date().toISOString() });
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [user]);

  return { sessionStartedISO: startedRef.current };
}
