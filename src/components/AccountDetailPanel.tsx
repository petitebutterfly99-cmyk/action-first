import { Account } from "@/data/mockAccounts";
import { X, Calendar, Users, Zap, MousePointer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccountDetailPanelProps {
  account: Account;
  onClose: () => void;
  onSendOutreach: (account: Account) => void;
}

export function AccountDetailPanel({ account, onClose, onSendOutreach }: AccountDetailPanelProps) {
  const timelineEvents = [
    { label: "Signed up", date: account.signupDate, done: true },
    { label: "First task created", date: account.firstTaskCreated ? `${account.minutesToFirstTask} min after signup` : "Never", done: account.firstTaskCreated },
    { label: "Teammate invited", date: account.invitesSent > 0 ? `${account.invitesSent} invite(s)` : "Never", done: account.invitesSent > 0 },
  ];

  return (
    <div className="w-96 border-l bg-card h-full overflow-y-auto shrink-0">
      <div className="sticky top-0 bg-card z-10 flex items-center justify-between px-5 py-4 border-b">
        <h2 className="font-semibold text-sm text-foreground">{account.name}</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Key stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Calendar, label: "Days since signup", value: `${account.daysSinceSignup}` },
            { icon: Users, label: "Active users", value: `${account.activeUsers}` },
            { icon: Zap, label: "Invites sent", value: `${account.invitesSent}` },
            { icon: MousePointer, label: "Last activity", value: account.lastActivityDays === 0 ? "Today" : `${account.lastActivityDays}d ago` },
          ].map((stat) => (
            <div key={stat.label} className="bg-muted/50 rounded-md p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <stat.icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Timeline</h3>
          <div className="space-y-3">
            {timelineEvents.map((event, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${event.done ? "bg-risk-low" : "bg-risk-high"}`} />
                <div>
                  <div className="text-sm text-foreground">{event.label}</div>
                  <div className={`text-xs ${event.done ? "text-muted-foreground" : "text-risk-high font-medium"}`}>{event.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insight */}
        <div className="bg-muted/50 rounded-md p-3 border border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {account.firstTaskCreated
              ? "Users who create a task within 10 minutes retain 2x more."
              : "This user hasn't created any tasks. Users who don't activate within 5 days churn at 82%."}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            Only 12% of users invite a teammate in the first 3 days. Accounts with invites retain at 68% vs 22% without.
          </p>
        </div>

        {/* Quote */}
        {account.quote && (
          <div className="border-l-2 border-primary/30 pl-3">
            <p className="text-xs italic text-muted-foreground">"{account.quote.text}"</p>
            <p className="text-[10px] text-muted-foreground mt-1">— {account.quote.source}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button className="w-full text-xs" size="sm" onClick={() => onSendOutreach(account)}>
            Send Outreach
          </Button>
          <Button className="w-full text-xs" size="sm" variant="outline">
            View Full Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
