import { useEffect, useState, type RefObject } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CoachmarkPopoverProps {
  open: boolean;
  /** Element the popover anchors to. May be null while resolving. */
  targetRef: RefObject<HTMLElement | null>;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
  onExit: () => void;
  stepNumber: number;
  totalSteps: number;
  /**
   * Use a higher z-index when the coachmark must float above a Radix
   * Dialog (z-50). Default is below the Dialog overlay.
   */
  elevated?: boolean;
}

/**
 * Floating coachmark popover, anchored to a real DOM element via
 * Radix `PopoverAnchor`. The anchor element keeps its normal click
 * behavior — the popover just floats next to it with an arrow.
 */
export function CoachmarkPopover({
  open,
  targetRef,
  side = "right",
  align = "center",
  title,
  body,
  ctaLabel,
  onCta,
  onExit,
  stepNumber,
  totalSteps,
  elevated = false,
}: CoachmarkPopoverProps) {
  // Re-render when the anchor element resolves (refs don't trigger renders).
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    // Poll briefly until the ref is populated — covers cases where the
    // anchor mounts a frame after the popover opens (e.g. a Dialog).
    let cancelled = false;
    const tryResolve = () => {
      if (cancelled) return;
      const el = targetRef.current ?? null;
      setAnchor(el);
      if (!el) requestAnimationFrame(tryResolve);
    };
    tryResolve();
    return () => {
      cancelled = true;
    };
  }, [open, targetRef]);

  return (
    <PopoverPrimitive.Root open={open && !!anchor}>
      {anchor && <PopoverPrimitive.Anchor virtualRef={{ current: anchor }} />}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={12}
          collisionPadding={16}
          // Don't steal focus — user should still be able to click the anchor.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          // Clicking the anchor or elsewhere should not silently close it.
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={() => onExit()}
          className={cn(
            "w-[320px] rounded-md border border-primary/40 bg-popover text-popover-foreground shadow-xl p-3",
            "animate-in fade-in-0 zoom-in-95",
            elevated ? "z-[60]" : "z-50",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">
                Guided · Step {stepNumber} of {totalSteps}
              </div>
              <div className="text-sm font-semibold text-foreground">{title}</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {body}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <Button size="sm" className="h-7 text-xs" onClick={onCta}>
                  {ctaLabel}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={onExit}
                >
                  Exit guided mode
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={onExit}
              aria-label="Exit guided mode"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <PopoverPrimitive.Arrow
            width={14}
            height={7}
            className="fill-popover stroke-primary/40"
            strokeWidth={1}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
