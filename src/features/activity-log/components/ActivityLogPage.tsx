import { Clock } from "lucide-react";
import { AppLayout } from "@/shared/components/AppLayout";
import { useActivityLog } from "../hooks/useActivityLog";

export default function ActivityLogPage() {
  const entries = useActivityLog();
  return (
    <AppLayout title="Activity Log" subtitle="Recent actions taken on accounts">
      <div className="space-y-2 max-w-2xl">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 bg-card border rounded-md px-4 py-3"
          >
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div>
                <span className="font-medium text-foreground">{entry.action}</span>
                <span className="text-muted-foreground"> on </span>
                <span className="font-medium text-foreground">{entry.account}</span>
                <span className="text-muted-foreground"> by </span>
                <span className="text-foreground">{entry.user}</span>
              </div>
              {entry.note && (
                <p className="text-xs text-muted-foreground mt-1 italic">"{entry.note}"</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{entry.timestamp}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
