import type { Account } from "@/shared/data/accounts";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  buildInsights,
  buildTimeline,
  TimelineState,
} from "./timeline";

interface AccountDetailPanelProps {
  account: Account;
  onClose: () => void;
  onSendOutreach: (account: Account) => void;
}

const STATE_STYLES: Record<
  TimelineState,
  { dot: string; icon: string; iconBg: string; text: string }
> = {
  done: {
    dot: "bg-[hsl(var(--risk-low))]",
    icon: "text-[hsl(var(--risk-low))]",
    iconBg: "bg-[hsl(var(--badge-success-bg))]",
    text: "text-muted-foreground",
  },
  missing: {
    dot: "bg-[hsl(var(--risk-high))]",
    icon: "text-[hsl(var(--risk-high))]",
    iconBg: "bg-[hsl(var(--badge-urgent-bg))]",
    text: "text-[hsl(var(--risk-high))] font-medium",
  },
  warning: {
    dot: "bg-[hsl(var(--risk-medium))]",
    icon: "text-[hsl(var(--risk-medium))]",
    iconBg: "bg-[hsl(var(--badge-warning-bg))]",
    text: "text-[hsl(var(--risk-medium))] font-medium",
  },
};

export function AccountDetailPanel({
  account,
  onClose,
  onSendOutreach,
}: AccountDetailPanelProps) {
  const events = buildTimeline(account);
  const insights = buildInsights(account);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b space-y-1 text-left">
          <SheetTitle className="text-sm font-semibold">{account.name}</SheetTitle>
          <SheetDescription className="text-xs">
            {account.contactName} · {account.plan} · ${(account.arr / 1000).toFixed(0)}k ARR
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Calendar, label: "Days since signup", value: `${account.daysSinceSignup}` },
                { icon: Zap, label: "Invites", value: `${account.invitesSent}` },
                { icon: Users, label: "Active users", value: `${account.activeUsers}` },
              ].map((stat) => (
                <div key={stat.label} className="bg-muted/50 rounded-md p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                      {stat.label}
                    </span>
                  </div>
                  <span className="text-base font-semibold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Highlighted insights */}
            {insights.length > 0 && (
              <div className="rounded-md border border-[hsl(var(--risk-high))]/30 bg-[hsl(var(--badge-urgent-bg))]/40 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--risk-high))]" />
                  <span className="text-xs font-semibold text-foreground">
                    Why this account is at risk
                  </span>
                </div>
                <ul className="space-y-1">
                  {insights.map((insight) => (
                    <li
                      key={insight}
                      className="flex items-start gap-2 text-xs text-foreground"
                    >
                      <XCircle className="w-3 h-3 text-[hsl(var(--risk-high))] mt-0.5 shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Vertical timeline */}
            <div>
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                Account Timeline
              </h3>
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />
                <ol className="space-y-4">
                  {events.map((event, i) => {
                    const styles = STATE_STYLES[event.state];
                    const Icon = event.icon;
                    return (
                      <li key={i} className="relative flex items-start gap-3">
                        <div
                          className={cn(
                            "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            styles.iconBg,
                          )}
                        >
                          <Icon className={cn("w-4 h-4", styles.icon)} />
                        </div>
                        <div className="flex-1 pt-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-foreground truncate">
                              {event.label}
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {event.day}
                            </span>
                          </div>
                          <div className={cn("text-xs mt-0.5", styles.text)}>{event.detail}</div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>

            {/* Benchmark insight */}
            <div className="bg-muted/50 rounded-md p-3 border border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {account.firstTaskCreated
                  ? "Users who create a task within 10 minutes retain 2x more."
                  : "This user hasn't created any tasks. Users who don't activate within 5 days churn at 82%."}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                Only 12% of users invite a teammate in the first 3 days. Accounts with invites
                retain at 68% vs 22% without.
              </p>
            </div>

            {/* Quote */}
            {account.quote && (
              <div className="border-l-2 border-primary/30 pl-3">
                <p className="text-xs italic text-muted-foreground">"{account.quote.text}"</p>
                <p className="text-[10px] text-muted-foreground mt-1">— {account.quote.source}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Sticky action footer */}
        <div className="border-t bg-card px-5 py-3 space-y-2">
          <Button className="w-full text-xs" size="sm" onClick={() => onSendOutreach(account)}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Send Outreach
          </Button>
          <Button className="w-full text-xs" size="sm" variant="ghost" onClick={onClose}>
            Back to Action Queue
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
