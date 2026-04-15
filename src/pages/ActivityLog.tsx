import { AppLayout } from "@/components/AppLayout";
import { activityLog } from "@/data/mockAccounts";
import { Clock } from "lucide-react";

export default function ActivityLogPage() {
  return (
    <AppLayout title="Activity Log" subtitle="Recent actions taken on accounts">
      <div className="space-y-2 max-w-2xl">
        {activityLog.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 bg-card border rounded-md px-4 py-3">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-medium text-foreground">{entry.action}</span>
              <span className="text-muted-foreground"> on </span>
              <span className="font-medium text-foreground">{entry.account}</span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{entry.timestamp}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
