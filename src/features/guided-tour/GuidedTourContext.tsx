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

export type GuidedStep = "highlight" | "detail" | "outreach" | "success" | null;

interface GuidedTourValue {
  /** Currently active guided step, or null when guided mode is off. */
  step: GuidedStep;
  /** True whenever guided mode is engaged (step !== null). */
  active: boolean;
  /** Account id the tour is currently focused on (the highest-risk pick). */
  focusAccountId: string | null;
  /** Start the tour on a given account. */
  start: (accountId: string, opts?: { source?: "auto" | "manual" }) => void;
  /** Move to a specific step. Tracking is fired for transitions. */
  goTo: (next: GuidedStep) => void;
  /** Exit the tour entirely. */
  exit: (reason?: "user" | "completed") => void;
}

const Ctx = createContext<GuidedTourValue | undefined>(undefined);

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<GuidedStep>(null);
  const [focusAccountId, setFocusAccountId] = useState<string | null>(null);
  const sourceRef = useRef<"auto" | "manual">("manual");

  const start = useCallback((accountId: string, opts?: { source?: "auto" | "manual" }) => {
    sourceRef.current = opts?.source ?? "manual";
    setFocusAccountId(accountId);
    setStep("highlight");
    void trackEvent({
      type: "guided_flow_started",
      accountId,
      metadata: { source: sourceRef.current },
    });
  }, []);

  const goTo = useCallback((next: GuidedStep) => {
    setStep(next);
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

  const value = useMemo<GuidedTourValue>(
    () => ({ step, active: step !== null, focusAccountId, start, goTo, exit }),
    [step, focusAccountId, start, goTo, exit],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGuidedTour(): GuidedTourValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback — tour never engaged outside the provider tree.
    return {
      step: null,
      active: false,
      focusAccountId: null,
      start: () => {},
      goTo: () => {},
      exit: () => {},
    };
  }
  return ctx;
}
