import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/components/AuthProvider";

export interface UserSettings {
  email_alerts_high_risk: boolean;
  daily_digest: boolean;
  slack_notifications: boolean;
  risk_thresholds: Record<string, unknown>;
  show_guided_tour_buttons: boolean;
}

const DEFAULTS: UserSettings = {
  email_alerts_high_risk: true,
  daily_digest: true,
  slack_notifications: false,
  risk_thresholds: {
    high: { min_inactive_days: 2, requires_no_invites: true },
    medium: { min_inactive_days: 1 },
  },
  show_guided_tour_buttons: true,
};

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<keyof UserSettings | null>(null);

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error: err } = await supabase
        .from("user_settings")
        .select("email_alerts_high_risk, daily_digest, slack_notifications, risk_thresholds")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setSettings(DEFAULTS);
      } else if (data) {
        setSettings({
          email_alerts_high_risk: data.email_alerts_high_risk,
          daily_digest: data.daily_digest,
          slack_notifications: data.slack_notifications,
          risk_thresholds: (data.risk_thresholds as Record<string, unknown>) ?? DEFAULTS.risk_thresholds,
        });
      } else {
        setSettings(DEFAULTS);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateToggle = useCallback(
    async (field: keyof UserSettings, value: boolean) => {
      if (!user || !settings) return;
      const previous = settings;
      const next = { ...settings, [field]: value };
      setSettings(next);
      setSaving(field);
      setError(null);
      const { error: err } = await supabase
        .from("user_settings")
        .upsert(
          [
            {
              user_id: user.id,
              email_alerts_high_risk: next.email_alerts_high_risk,
              daily_digest: next.daily_digest,
              slack_notifications: next.slack_notifications,
              risk_thresholds: next.risk_thresholds as never,
            },
          ],
          { onConflict: "user_id" },
        );
      setSaving(null);
      if (err) {
        setSettings(previous); // rollback
        setError(err.message);
      }
    },
    [user, settings],
  );

  return { settings, loading, error, saving, updateToggle };
}
