import { AppLayout } from "@/shared/components/AppLayout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useUserSettings } from "../hooks/useUserSettings";

export default function SettingsPage() {
  const { settings, loading, error, saving, updateToggle } = useUserSettings();

  return (
    <AppLayout title="Settings" subtitle="Configure your intervention preferences">
      <div className="max-w-lg space-y-6">
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Couldn't save — {error}</span>
            </div>
          )}

          {loading || !settings ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  Email alerts for high-risk accounts
                </Label>
                <Switch
                  checked={settings.email_alerts_high_risk}
                  disabled={saving === "email_alerts_high_risk"}
                  onCheckedChange={(v) => updateToggle("email_alerts_high_risk", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Daily digest of action queue</Label>
                <Switch
                  checked={settings.daily_digest}
                  disabled={saving === "daily_digest"}
                  onCheckedChange={(v) => updateToggle("daily_digest", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Slack notifications</Label>
                <Switch
                  checked={settings.slack_notifications}
                  disabled={saving === "slack_notifications"}
                  onCheckedChange={(v) => updateToggle("slack_notifications", v)}
                />
              </div>
            </>
          )}
        </div>

        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Onboarding</h3>
          {loading || !settings ? (
            <Skeleton className="h-6 w-full" />
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label className="text-sm text-muted-foreground">
                  Show guided tour buttons in Action Queue
                </Label>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Re-enable the "Start with highest-risk account" and "Guide me"
                  buttons on the queue page.
                </p>
              </div>
              <Switch
                checked={settings.show_guided_tour_buttons}
                disabled={saving === "show_guided_tour_buttons"}
                onCheckedChange={(v) => updateToggle("show_guided_tour_buttons", v)}
              />
            </div>
          )}
        </div>

        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Risk Thresholds</h3>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>High Risk: No invites + no activity for 2+ days</p>
            <p>Medium Risk: No invites OR low activity</p>
            <p>Healthy: Active with teammate invites</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
