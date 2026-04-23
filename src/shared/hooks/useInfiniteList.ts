import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Incrementally reveal items from a sorted/filtered list as the user scrolls.
 * Keeps the DOM small (and the page snappy) when there are hundreds of rows.
 *
 * Returns the visible slice plus a `sentinelRef` to attach to a div near the
 * bottom of the list — when it intersects the viewport, the next batch is
 * appended.
 */
export function useInfiniteList<T, E extends HTMLElement = HTMLDivElement>(
  items: T[],
  batchSize = 50,
) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef<E | null>(null);

  // Reset when the underlying list changes shape (filters applied, refresh, etc.)
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [items.length, batchSize]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (visibleCount >= items.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + batchSize, items.length));
        }
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [items.length, visibleCount, batchSize]);

  const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  /** Ensure at least `n` items are rendered (used for deep-link focus). */
  const revealAtLeast = (n: number) =>
    setVisibleCount((c) => (n > c ? Math.min(n, items.length) : c));

  return { visible, hasMore, sentinelRef, visibleCount, total: items.length, revealAtLeast };
}
