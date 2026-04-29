import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CoachmarkBackdropProps {
  targetRef: RefObject<HTMLElement | null>;
  /** Padding around the highlighted element, in pixels. */
  padding?: number;
  /** Border-radius of the cutout, in pixels. */
  radius?: number;
}

/**
 * Full-screen dimmed overlay with a transparent cutout around the
 * target element. The cutout is drawn with a giant box-shadow trick
 * so we don't need SVG masks.
 *
 * The backdrop itself is `pointer-events: none` so clicks still reach
 * the highlighted element — the user can interact with it normally.
 */
export function CoachmarkBackdrop({
  targetRef,
  padding = 6,
  radius = 8,
}: CoachmarkBackdropProps) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const el = targetRef.current;
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      // Skip if the element is detached (zero-sized + zero-positioned).
      if (r.width === 0 && r.height === 0 && r.top === 0 && r.left === 0) {
        setRect(null);
        return;
      }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);

    let ro: ResizeObserver | null = null;
    if (targetRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(schedule);
      ro.observe(targetRef.current);
    }

    // Also poll on a slow interval for layout shifts we can't observe
    // (sticky headers settling, font load, etc).
    const interval = window.setInterval(schedule, 250);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.clearInterval(interval);
      ro?.disconnect();
    };
  }, [targetRef]);

  if (typeof document === "undefined") return null;
  if (!rect) return null;

  return createPortal(
    <div
      // The cutout div is sized to the target; the giant box-shadow
      // dims everything outside it.
      aria-hidden
      className="fixed pointer-events-none transition-[top,left,width,height] duration-150 ease-out"
      style={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        borderRadius: radius,
        boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
        zIndex: 40,
      }}
    />,
    document.body,
  );
}
