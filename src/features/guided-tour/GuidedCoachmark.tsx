import type { RefObject } from "react";
import { CoachmarkPopover } from "./CoachmarkPopover";
import { TOTAL_TOUR_STEPS, type GuidedStep } from "./GuidedTourContext";

type AnchorRef = RefObject<HTMLElement | null> | { current: HTMLElement | null };

type StepKey = Exclude<GuidedStep, null | "success">;

interface GuidedCoachmarkProps {
  step: StepKey;
  stepNumber: number;
  anchors: Record<StepKey, AnchorRef>;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface StepCopy {
  title: string;
  body: string;
  side?: "top" | "bottom" | "left" | "right";
  nextLabel?: string;
  showNext?: boolean;
}

const COPY: Record<StepKey, StepCopy> = {
  welcome: {
    title: "This is your CSM Action Queue",
    body: "We'll walk through filters, metrics, and your first outreach. Takes about 30 seconds.",
    side: "bottom",
    nextLabel: "Start tour",
  },
  filters_risk: {
    title: "Focus on the riskiest accounts",
    body: "Toggle Risk Level to narrow the queue. High-risk accounts are most likely to ghost.",
    side: "bottom",
  },
  filters_status: {
    title: "Filter by where you left off",
    body: "Use Queue Status to revisit Contacted, Snoozed, or Follow-up needed accounts.",
    side: "bottom",
  },
  kpi: {
    title: "Today at a glance",
    body: "Coverage of high-risk accounts and outreach attempts update live as you take action.",
    side: "bottom",
  },
  performance: {
    title: "Self-check your week",
    body: "Open CSM Performance for action mix, AI suggestion usage, retry rate, and filter habits.",
    side: "bottom",
  },
  highlight_row: {
    title: "Your top high-risk account",
    body: "This account hasn't invited teammates and is at risk of early churn. Click Next to open it.",
    side: "right",
    nextLabel: "Open account",
  },
  detail_panel: {
    title: "Send the outreach",
    body: "Review the AI-generated message, then click Send Outreach. You can edit before sending.",
    side: "left",
    nextLabel: "Open send dialog",
  },
  outreach_modal: {
    title: "Personalize and send",
    body: "Edit the message if needed, then click Send Message. We'll log it for you.",
    side: "top",
    showNext: false,
  },
};

/**
 * Renders the right floating coachmark for the current guided step.
 * Falls back to a centered popover when the anchor is not yet mounted
 * (e.g. side panel not open yet).
 */
export function GuidedCoachmark({
  step,
  stepNumber,
  anchors,
  onNext,
  onBack,
  onSkip,
}: GuidedCoachmarkProps) {
  const copy = COPY[step];
  const anchorRef = anchors[step] as RefObject<HTMLElement | null>;
  const hasAnchor = !!anchorRef?.current;

  return (
    <CoachmarkPopover
      open
      anchorRef={anchorRef}
      title={copy.title}
      body={copy.body}
      stepNumber={stepNumber}
      totalSteps={TOTAL_TOUR_STEPS}
      side={copy.side ?? "bottom"}
      nextLabel={copy.nextLabel ?? "Next"}
      showNext={copy.showNext ?? true}
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
      withBackdrop={hasAnchor}
    />
  );
}
