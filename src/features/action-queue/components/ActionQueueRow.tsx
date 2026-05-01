import { forwardRef } from "react";
import type { Account, AccountStatus, RiskLevel } from "@/shared/data/accounts";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  ChevronRight,
  Clock,
  MessageCircle,
  PlayCircle,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ActionQueueRowProps {
  account: Account;
  onSendOutreach: (account: Account) => void;
  onPromptInvite: (account: Account) => void;
  onMarkReviewed: (account: Account) => void;
  onSelect: (account: Account) => void;
  onSnooze: (account: Account) => void;
  selected: boolean;
  onToggleSelected: (id: string, checked: boolean) => void;
  highlight?: boolean;
  snoozeUntil?: Date;
  followUpDate?: Date;
  /** Optional ref forwarded to the account-name link (for the guided tour). */
  nameLinkRef?: React.Ref<HTMLButtonElement>;
}

const STATUS_PILL: Record<AccountStatus, { label: string; className: string } | null> = {
  needs_action: null,
  contacted: { label: "Contacted", className: "bg-muted text-muted-foreground border-border" },
  reviewed: { label: "Reviewed", className: "bg-muted text-muted-foreground border-border" },
  snoozed: { label: "Snoozed", className: "bg-muted text-muted-foreground border-border" },
  follow_up_needed: {
    label: "Follow-up Needed",
    className: "bg-primary/10 text-primary border-primary/20",
  },
};

function RiskBadge({ risk }: { risk: RiskLevel }) {
  if (risk === "high") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-badge-urgent-bg text-badge-urgent-fg border border-[hsl(var(--risk-high))]/30">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--risk-high))]" />
        High Risk
      </span>
    );
  }
  if (risk === "medium") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-badge-warning-bg text-badge-warning-fg border border-[hsl(var(--risk-medium))]/30">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--risk-medium))]" />
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded bg-badge-success-bg text-badge-success-fg border border-[hsl(var(--risk-low))]/20">
      <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--risk-low))]" />
      Healthy
    </span>
  );
}

interface PrimaryAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "outline";
}

/**
 * Single row in the Action Queue. Pure presentation — every behavior is a
 * callback handed in by the parent.
 *
 * Renamed from `AccountCard` because it's not a generic account card — it's
 * specifically the queue row, with state-aware CTAs and processed-row sinking.
 */
export const ActionQueueRow = forwardRef<HTMLDivElement, ActionQueueRowProps>(
  function ActionQueueRow(
    {
      account,
      onSendOutreach,
      onPromptInvite,
      onMarkReviewed,
      onSelect,
      onSnooze,
      selected,
      onToggleSelected,
      highlight = false,
      snoozeUntil,
      followUpDate,
      nameLinkRef,
    },
    ref,
  ) {
    const isContacted = account.status === "contacted";
    const isReviewed = account.status === "reviewed";
    const isSnoozed = account.status === "snoozed";
    const isFollowUp = account.status === "follow_up_needed";
    const isProcessed = isContacted || isReviewed || isSnoozed;
    const pill = STATUS_PILL[account.status];

    // Row-level "Contacted today" label is derived from the outreach
    // timestamp — the same source of truth as the aggregate metric.
    const contactedToday = (() => {
      const iso = account.lastOutreachSentAt;
      if (!iso) return false;
      const d = new Date(iso);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    })();

    // Risk drives the left border color (priority signal).
    const riskBorderClass =
      account.risk === "high"
        ? "border-l-4 border-l-[hsl(var(--risk-high))]"
        : account.risk === "medium"
          ? "border-l-4 border-l-[hsl(var(--risk-medium))]"
          : "border-l-4 border-l-[hsl(var(--risk-low))]/40";

    // Subtle background tint only for High Risk + still actionable.
    const riskTintClass =
      account.risk === "high" && !isProcessed ? "bg-[hsl(var(--badge-urgent-bg))]/30" : "bg-card";

    // Healthy + processed rows lose more contrast.
    const demotedClass = isProcessed
      ? account.risk === "low"
        ? "opacity-60"
        : "opacity-75"
      : account.risk === "low"
        ? "opacity-90"
        : "";

    // Determine state-aware primary CTA.
    const primary: PrimaryAction = (() => {
      if (isSnoozed) {
        return {
          label: "Resume",
          icon: <PlayCircle className="w-3.5 h-3.5 mr-1" />,
          onClick: () => onMarkReviewed({ ...account, status: "needs_action" } as Account),
          variant: "default",
        };
      }
      if (isFollowUp) {
        return {
          label: "Follow Up",
          icon: <ArrowUpRight className="w-3.5 h-3.5 mr-1" />,
          onClick: () => onSendOutreach(account),
          variant: "default",
        };
      }
      if (isReviewed) {
        return {
          label: "Reopen",
          icon: <RotateCcw className="w-3.5 h-3.5 mr-1" />,
          onClick: () => onSendOutreach(account),
          variant: "default",
        };
      }
      if (isContacted) {
        return {
          label: "Log Outcome",
          icon: <CheckCircle className="w-3.5 h-3.5 mr-1" />,
          onClick: () => onSendOutreach(account),
          variant: "default",
        };
      }
      return {
        label: "Send Outreach",
        icon: <MessageCircle className="w-3.5 h-3.5 mr-1" />,
        onClick: () => onSendOutreach(account),
        variant: "default",
      };
    })();

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-border shadow-sm hover:shadow transition-all",
          riskBorderClass,
          riskTintClass,
          demotedClass,
          selected && "ring-2 ring-primary border-primary",
          highlight && "ring-2 ring-primary border-primary animate-pulse",
        )}
      >
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selected}
              onCheckedChange={(c) => onToggleSelected(account.id, c === true)}
              aria-label={`Select ${account.name}`}
            />
            <button
              onClick={() => onSelect(account)}
              className="text-left min-w-0 w-[200px] shrink-0"
            >
              <div
                className={cn(
                  "font-semibold text-sm truncate hover:text-primary transition-colors",
                  isProcessed ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {account.name}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {account.contactName} · {account.plan}
              </div>
            </button>

            <div className="hidden md:grid grid-cols-5 gap-3 flex-1 min-w-0 text-xs">
              <Metric label="Day" value={String(account.daysSinceSignup)} />
              <Metric
                label="Invites"
                value={String(account.invitesSent)}
                tone={account.invitesSent === 0 ? "danger" : "default"}
              />
              <Metric label="Users" value={String(account.activeUsers)} />
              <Metric
                label="Last activity"
                value={
                  account.lastActivityDays === 0 ? "Today" : `${account.lastActivityDays}d ago`
                }
                tone={account.lastActivityDays >= 2 ? "warn" : "default"}
              />
              <Metric label="ARR" value={`$${(account.arr / 1000).toFixed(0)}k`} />
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0 w-[150px]">
              <RiskBadge risk={account.risk} />
              {pill && (
                <span
                  className={cn(
                    "inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border",
                    pill.className,
                  )}
                >
                  {pill.label}
                  {isSnoozed && snoozeUntil && (
                    <span className="ml-1 opacity-80">· {snoozeUntil.toLocaleDateString()}</span>
                  )}
                  {isFollowUp && followUpDate && (
                    <span className="ml-1 opacity-80">· {followUpDate.toLocaleDateString()}</span>
                  )}
                </span>
              )}
              {contactedToday && (
                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border bg-badge-success-bg text-badge-success-fg border-[hsl(var(--risk-low))]/30">
                  Contacted today
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant={primary.variant}
                className="h-8 text-xs"
                onClick={primary.onClick}
              >
                {primary.icon}
                {primary.label}
              </Button>
              <button
                onClick={() => onSelect(account)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="View details"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 mt-2 pl-7 text-[11px]">
            <SecondaryAction
              label="Prompt Invite"
              icon={<UserPlus className="w-3 h-3 mr-1" />}
              onClick={() => onPromptInvite(account)}
            />
            {!isReviewed && (
              <SecondaryAction
                label="Mark Reviewed"
                icon={<CheckCircle className="w-3 h-3 mr-1" />}
                onClick={() => onMarkReviewed(account)}
              />
            )}
            {!isSnoozed && (
              <SecondaryAction
                label="Snooze"
                icon={<Clock className="w-3 h-3 mr-1" />}
                onClick={() => onSnooze(account)}
              />
            )}

            {account.quote && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="ml-auto text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span className="italic truncate max-w-[260px]">"{account.quote.text}"</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm italic">"{account.quote.text}"</p>
                  <p className="text-xs text-muted-foreground mt-1">— {account.quote.source}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    );
  },
);

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "warn";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[hsl(var(--risk-high))] font-semibold"
      : tone === "warn"
        ? "text-[hsl(var(--risk-medium))] font-semibold"
        : "text-foreground font-medium";
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-xs truncate", toneClass)}>{value}</div>
    </div>
  );
}

function SecondaryAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
    >
      {icon}
      {label}
    </button>
  );
}
