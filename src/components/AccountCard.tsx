import { Account, RiskLevel } from "@/data/mockAccounts";
import { AlertTriangle, MessageCircle, UserPlus, CheckCircle, ChevronRight, Quote, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AccountCardProps {
  account: Account;
  onSendOutreach: (account: Account) => void;
  onPromptInvite: (account: Account) => void;
  onMarkReviewed: (account: Account) => void;
  onSelect: (account: Account) => void;
  onSnooze: (account: Account) => void;
  selected: boolean;
  onToggleSelected: (id: string, checked: boolean) => void;
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  if (risk === "high") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-badge-urgent-bg text-badge-urgent-fg">
        🔴 High Risk
      </span>
    );
  }
  if (risk === "medium") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-badge-warning-bg text-badge-warning-fg">
        🟡 Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-badge-success-bg text-badge-success-fg">
      🟢 Healthy
    </span>
  );
}

export function AccountCard({
  account,
  onSendOutreach,
  onPromptInvite,
  onMarkReviewed,
  onSelect,
  onSnooze,
  selected,
  onToggleSelected,
}: AccountCardProps) {
  const isContacted = account.status === "contacted";
  const isReviewed = account.status === "reviewed";

  return (
    <div
      className={`bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow ${
        selected ? "ring-2 ring-primary border-primary" : ""
      } ${isContacted || isReviewed ? "opacity-60" : ""}`}
    >
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Checkbox
              checked={selected}
              onCheckedChange={(c) => onToggleSelected(account.id, c === true)}
              aria-label={`Select ${account.name}`}
              className="mt-0.5"
            />
            <button onClick={() => onSelect(account)} className="text-left min-w-0">
              <div className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate">
                {account.name}
              </div>
              <div className="text-xs text-muted-foreground">{account.contactName} · {account.plan}</div>
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RiskBadge risk={account.risk} />
            {isContacted && (
              <span className="text-xs text-primary font-medium">Contacted</span>
            )}
            {isReviewed && (
              <span className="text-xs text-muted-foreground font-medium">Reviewed</span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs mb-3">
          <span className="text-muted-foreground">
            Day <span className="font-medium text-foreground">{account.daysSinceSignup}</span>
          </span>
          <span className={account.invitesSent === 0 ? "text-risk-high font-medium" : "text-muted-foreground"}>
            {account.invitesSent} invites
          </span>
          <span className="text-muted-foreground">
            {account.activeUsers} user{account.activeUsers > 1 ? "s" : ""}
          </span>
          <span className={account.lastActivityDays >= 2 ? "text-risk-medium font-medium" : "text-muted-foreground"}>
            {account.lastActivityDays === 0 ? "Active today" : `No activity in ${account.lastActivityDays}d`}
          </span>
          <span className="text-muted-foreground ml-auto">${(account.arr / 1000).toFixed(0)}k ARR</span>
        </div>

        {/* Context insight */}
        <div className="bg-muted/50 rounded-md px-3 py-2 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-risk-medium mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {account.invitesSent === 0
                ? `This account has not invited any teammates within ${account.daysSinceSignup} days of signup. Accounts like this churn at 78%.`
                : `Account showing some activation but needs monitoring. Accounts with invites retain at 68% vs 22% without.`}
            </p>
          </div>
        </div>

        {/* Quote */}
        {account.quote && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-start gap-2 mb-3 cursor-help">
                <Quote className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground italic truncate">
                  "{account.quote.text}" — <span className="not-italic">{account.quote.source}</span>
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-sm italic">"{account.quote.text}"</p>
              <p className="text-xs text-muted-foreground mt-1">— {account.quote.source}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="text-xs h-7"
            onClick={() => onSendOutreach(account)}
            disabled={isContacted}
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            Send Outreach
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => onPromptInvite(account)}
          >
            <UserPlus className="w-3 h-3 mr-1" />
            Prompt Invite
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7"
            onClick={() => onMarkReviewed(account)}
            disabled={isReviewed}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Mark Reviewed
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7"
            onClick={() => onSnooze(account)}
          >
            <Clock className="w-3 h-3 mr-1" />
            Snooze
          </Button>
          <button
            onClick={() => onSelect(account)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
