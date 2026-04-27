import { AlertCircle, Clock, Inbox, RefreshCw } from "lucide-react";
import { AppLayout } from "@/shared/components/AppLayout";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityLog } from "../hooks/useActivityLog";
import { useInfiniteList } from "@/shared/hooks/useInfiniteList";
import type { ActivityEntry } from "../api/activityStore";

const ACTIVITY_BATCH_SIZE = 50;

export default function ActivityLogPage() {
  const { entries, loading, error, reload } = useActivityLog();
  const {
    visible: visibleEntries,
    hasMore,
    sentinelRef,
    visibleCount,
    revealAtLeast,
  } = useInfiniteList<ActivityEntry, HTMLDivElement>(entries, ACTIVITY_BATCH_SIZE);
  const loadMore = () => revealAtLeast(visibleCount + ACTIVITY_BATCH_SIZE);

  return (
    <AppLayout title="Activity Log" subtitle="Recent actions taken on accounts">
      <div className="space-y-2 max-w-2xl">
        {loading && entries.length === 0 ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-card border rounded-md px-4 py-3"
            >
              <Skeleton className="w-3.5 h-3.5 rounded shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-12 shrink-0" />
            </div>
          ))
        ) : error && entries.length === 0 ? (
          <EmptyState
            icon={<AlertCircle className="w-6 h-6 text-[hsl(var(--risk-high))]" />}
            title="Couldn't load activity"
            body="We ran into a problem loading your activity log."
            actions={
              <Button size="sm" onClick={reload}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry
              </Button>
            }
          />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-6 h-6 text-muted-foreground" />}
            title="No activity yet"
            body="Your actions from the queue will appear here."
          />
        ) : (
          <>
            {visibleEntries.map((entry) => (
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
            {hasMore ? (
              <div ref={sentinelRef} className="py-4 flex flex-col items-center gap-2">
                <Button size="sm" variant="ghost" onClick={loadMore}>
                  Load more
                </Button>
                <span className="text-xs text-muted-foreground">
                  Showing {visibleCount} of {entries.length}
                </span>
              </div>
            ) : (
              entries.length > ACTIVITY_BATCH_SIZE && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Showing all {entries.length} entries
                </div>
              )
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
