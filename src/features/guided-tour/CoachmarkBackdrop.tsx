import { useEffect, useState, type RefObject } from "react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CoachmarkBackdropProps {
  anchorRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  /** Pixels of padding around the anchor cutout. */
  padding?: number;
  /** Border-radius (px) of the cutout. */
  radius?: number;
}

/**
 * Dim overlay with a "cutout" hole around the anchor element so it stays
 * visible and clickable. If the anchor isn't mounted, renders a plain dim
 * overlay so the popover still has visual context.
 */
export function CoachmarkBackdrop({
  anchorRef,
  onDismiss,
  padding = 6,
  radius = 8,
}: CoachmarkBackdropProps) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) {
      setRect(null);
      return;
    }
    const recompute = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    const interval = window.setInterval(recompute, 250); // catch layout shifts
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
      window.clearInterval(interval);
    };
  }, [anchorRef]);

  if (!rect) {
    return (
      <div
        onClick={onDismiss}
        className="fixed inset-0 z-[55] bg-foreground/30 animate-in fade-in"
        aria-hidden
      />
    );
  }

  return (
    <>
      {/* Top */}
      <div
        onClick={onDismiss}
        className="fixed left-0 right-0 z-[55] bg-foreground/40 animate-in fade-in"
        style={{ top: 0, height: Math.max(0, rect.top - padding) }}
        aria-hidden
      />
      {/* Bottom */}
      <div
        onClick={onDismiss}
        className="fixed left-0 right-0 z-[55] bg-foreground/40 animate-in fade-in"
        style={{
          top: rect.top + rect.height + padding,
          bottom: 0,
        }}
        aria-hidden
      />
      {/* Left */}
      <div
        onClick={onDismiss}
        className="fixed z-[55] bg-foreground/40 animate-in fade-in"
        style={{
          top: Math.max(0, rect.top - padding),
          left: 0,
          width: Math.max(0, rect.left - padding),
          height: rect.height + padding * 2,
        }}
        aria-hidden
      />
      {/* Right */}
      <div
        onClick={onDismiss}
        className="fixed z-[55] bg-foreground/40 animate-in fade-in"
        style={{
          top: Math.max(0, rect.top - padding),
          left: rect.left + rect.width + padding,
          right: 0,
          height: rect.height + padding * 2,
        }}
        aria-hidden
      />
      {/* Highlight ring (non-interactive, lets clicks reach the target) */}
      <div
        className="fixed z-[55] pointer-events-none ring-2 ring-primary ring-offset-2 ring-offset-background animate-in fade-in"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          borderRadius: radius,
        }}
        aria-hidden
      />
    </>
  );
}
