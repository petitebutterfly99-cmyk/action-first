import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CoachmarkBackdrop } from "./CoachmarkBackdrop";

type Side = "top" | "bottom" | "left" | "right";

interface CoachmarkPopoverProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  title: string;
  body: string;
  stepNumber: number;
  totalSteps: number;
  side?: Side;
  nextLabel?: string;
  showBack?: boolean;
  showNext?: boolean;
  onNext?: () => void;
  onBack?: () => void;
  onSkip: () => void;
  /** When true, renders a dim backdrop with a cutout around the anchor. */
  withBackdrop?: boolean;
}

const GAP = 14; // px gap between anchor edge and popover

function clampToViewport(top: number, left: number, w: number, h: number) {
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    top: Math.max(margin, Math.min(top, vh - h - margin)),
    left: Math.max(margin, Math.min(left, vw - w - margin)),
  };
}

/**
 * Floating coachmark anchored to a target element. Pure portal — bypasses
 * Radix entirely so it works above modals and side sheets without z-index
 * fights. Anchored target stays interactive (we don't cover it).
 */
export function CoachmarkPopover({
  open,
  anchorRef,
  title,
  body,
  stepNumber,
  totalSteps,
  side = "bottom",
  nextLabel = "Next",
  showBack = true,
  showNext = true,
  onNext,
  onBack,
  onSkip,
  withBackdrop = true,
}: CoachmarkPopoverProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [size, setSize] = useState({ w: 320, h: 180 });

  // Esc closes the tour.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onSkip]);

  // Recompute position whenever target/viewport changes.
  useLayoutEffect(() => {
    if (!open) return;
    const compute = () => {
      const el = anchorRef.current;
      if (!el) {
        // Center on viewport if we have nothing to anchor to.
        const top = Math.max(20, window.innerHeight / 2 - size.h / 2);
        const left = Math.max(20, window.innerWidth / 2 - size.w / 2);
        setPos({ top, left });
        return;
      }
      const r = el.getBoundingClientRect();
      let top = 0;
      let left = 0;
      switch (side) {
        case "top":
          top = r.top - size.h - GAP;
          left = r.left + r.width / 2 - size.w / 2;
          break;
        case "left":
          top = r.top + r.height / 2 - size.h / 2;
          left = r.left - size.w - GAP;
          break;
        case "right":
          top = r.top + r.height / 2 - size.h / 2;
          left = r.right + GAP;
          break;
        case "bottom":
        default:
          top = r.bottom + GAP;
          left = r.left + r.width / 2 - size.w / 2;
          break;
      }
      // If overflowing bottom, flip to top.
      if (side === "bottom" && top + size.h > window.innerHeight - 12) {
        top = r.top - size.h - GAP;
      }
      // If overflowing top, fall back to bottom.
      if (top < 12) {
        top = Math.min(r.bottom + GAP, window.innerHeight - size.h - 12);
      }
      const clamped = clampToViewport(top, left, size.w, size.h);
      setPos(clamped);
    };
    compute();
    const interval = window.setInterval(compute, 200);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, anchorRef, side, size.w, size.h]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      {withBackdrop && (
        <CoachmarkBackdrop anchorRef={anchorRef} onDismiss={onSkip} />
      )}
      {!withBackdrop && (
        <div
          className="fixed inset-0 z-[55] bg-foreground/20 animate-in fade-in pointer-events-none"
          aria-hidden
        />
      )}
      <div
        role="dialog"
        aria-label={title}
        ref={(el) => {
          if (el) {
            const r = el.getBoundingClientRect();
            if (Math.abs(r.width - size.w) > 2 || Math.abs(r.height - size.h) > 2) {
              setSize({ w: r.width, h: r.height });
            }
          }
        }}
        className={cn(
          // pointer-events-auto so the popover stays interactive even when
          // a Radix Sheet/Dialog locks scroll and disables pointer events
          // on the document body.
          "fixed z-[60] w-[320px] rounded-lg border border-primary/40 bg-popover text-popover-foreground shadow-xl p-4 pointer-events-auto",
          "animate-in fade-in zoom-in-95",
          pos ? "" : "opacity-0",
        )}
        style={
          pos
            ? { top: pos.top, left: pos.left }
            : { top: -9999, left: -9999 }
        }
      >
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Guided · {stepNumber} of {totalSteps}
              </span>
              <button
                type="button"
                onClick={onSkip}
                aria-label="Skip tour"
                className="text-muted-foreground hover:text-foreground transition-colors -mt-0.5 -mr-1 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {body}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {showBack && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={onBack}
                  disabled={stepNumber <= 1}
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back
                </Button>
              )}
              {showNext && (
                <Button
                  size="sm"
                  className="h-7 text-xs ml-auto"
                  onClick={onNext}
                >
                  {nextLabel}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
              {!showNext && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs ml-auto text-muted-foreground"
                  onClick={onSkip}
                >
                  End guided tour
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
