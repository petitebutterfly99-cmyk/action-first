import { AppLayout } from "@/components/AppLayout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <AppLayout title="Settings" subtitle="Configure your intervention preferences">
      <div className="max-w-lg space-y-6">
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Email alerts for high-risk accounts</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Daily digest of action queue</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Slack notifications</Label>
            <Switch />
          </div>
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
