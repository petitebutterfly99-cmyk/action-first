import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { trackEvent } from "@/features/analytics";

export type GuidedStep =
  | "welcome"
  | "filters_risk"
  | "filters_status"
  | "kpi"
  | "performance"
  | "highlight_row"
  | "detail_panel"
  | "outreach_modal"
  | "success"
  | null;

/** Ordered tour steps used for next/back navigation and step numbering. */
export const TOUR_STEPS: Exclude<GuidedStep, null | "success">[] = [
  "welcome",
  "filters_risk",
  "filters_status",
  "kpi",
  "performance",
  "highlight_row",
  "detail_panel",
  "outreach_modal",
];

export const TOTAL_TOUR_STEPS = TOUR_STEPS.length;

interface GuidedTourValue {
  step: GuidedStep;
  active: boolean;
  focusAccountId: string | null;
  start: (accountId: string, opts?: { source?: "auto" | "manual" }) => void;
  goTo: (next: GuidedStep) => void;
  next: () => void;
  back: () => void;
  exit: (reason?: "user" | "completed") => void;
  /** 1-indexed step number for display, or null. */
  stepNumber: number | null;
}

const Ctx = createContext<GuidedTourValue | undefined>(undefined);

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<GuidedStep>(null);
  const [focusAccountId, setFocusAccountId] = useState<string | null>(null);
  const sourceRef = useRef<"auto" | "manual">("manual");

  const start = useCallback(
    (accountId: string, opts?: { source?: "auto" | "manual" }) => {
      sourceRef.current = opts?.source ?? "manual";
      setFocusAccountId(accountId);
      setStep("welcome");
      void trackEvent({
        type: "guided_flow_started",
        accountId,
        metadata: { source: sourceRef.current },
      });
    },
    [],
  );

  const goTo = useCallback((next: GuidedStep) => {
    setStep(next);
  }, []);

  const next = useCallback(() => {
    setStep((curr) => {
      if (curr === null || curr === "success") return curr;
      const idx = TOUR_STEPS.indexOf(curr as Exclude<GuidedStep, null | "success">);
      if (idx === -1) return curr;
      const nextStep = TOUR_STEPS[idx + 1];
      return nextStep ?? curr;
    });
  }, []);

  const back = useCallback(() => {
    setStep((curr) => {
      if (curr === null || curr === "success") return curr;
      const idx = TOUR_STEPS.indexOf(curr as Exclude<GuidedStep, null | "success">);
      if (idx <= 0) return curr;
      return TOUR_STEPS[idx - 1];
    });
  }, []);

  const exit = useCallback(
    (reason: "user" | "completed" = "user") => {
      if (step !== null) {
        void trackEvent({
          type: "guided_flow_exited",
          accountId: focusAccountId,
          metadata: { reason, last_step: step },
        });
      }
      setStep(null);
      setFocusAccountId(null);
    },
    [step, focusAccountId],
  );

  const value = useMemo<GuidedTourValue>(() => {
    let stepNumber: number | null = null;
    if (step && step !== "success") {
      const idx = TOUR_STEPS.indexOf(step as Exclude<GuidedStep, null | "success">);
      stepNumber = idx >= 0 ? idx + 1 : null;
    }
    return {
      step,
      active: step !== null,
      focusAccountId,
      start,
      goTo,
      next,
      back,
      exit,
      stepNumber,
    };
  }, [step, focusAccountId, start, goTo, next, back, exit]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGuidedTour(): GuidedTourValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      step: null,
      active: false,
      focusAccountId: null,
      start: () => {},
      goTo: () => {},
      next: () => {},
      back: () => {},
      exit: () => {},
      stepNumber: null,
    };
  }
  return ctx;
}
