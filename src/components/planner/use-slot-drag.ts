"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const EDGE_ZONE = 96;
const MAX_STEP = 18;

/**
 * How far the window should scroll this frame while a drag is held near the top
 * or bottom edge, ramping up the closer the pointer gets. A week is far taller
 * than a phone screen, so without this a meal could only be dropped on a day
 * that already happens to be visible.
 */
export function edgeScrollStep(
  clientY: number,
  viewportHeight: number,
  zone = EDGE_ZONE,
  max = MAX_STEP
): number {
  const ramp = (distance: number) =>
    Math.ceil((Math.min(Math.max(zone - distance, 0), zone) / zone) * max);

  if (clientY < zone) return -ramp(clientY);

  const fromBottom = viewportHeight - clientY;
  if (fromBottom < zone) return ramp(fromBottom);

  return 0;
}

export interface SlotDrag<T> {
  source: T;
  /** Key of the drop target currently under the pointer, if any. */
  overKey: string | null;
  x: number;
  y: number;
}

function keyUnder(x: number, y: number): string | null {
  const host = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("[data-slot-key]");
  return host?.dataset.slotKey ?? null;
}

/**
 * Drag-and-drop for planner slots, built on pointer events so that it behaves
 * the same under a finger as under a mouse. The HTML5 drag API this replaces is
 * mouse-only: touch browsers never fire dragstart, which left the grip handle
 * visible but dead on Android.
 *
 * Targets are found by hit-testing whatever sits under the pointer for a
 * `data-slot-key`, rather than by measuring slots up front, so auto-scrolling
 * mid-drag needs no bookkeeping.
 */
export function useSlotDrag<T>(
  onDrop: (source: T, targetKey: string) => void
) {
  const [drag, setDrag] = useState<SlotDrag<T> | null>(null);

  // The live drag is mirrored into a ref so the window listeners and the
  // scroll loop can be registered once per drag instead of on every move.
  const dragRef = useRef<SlotDrag<T> | null>(null);
  const onDropRef = useRef(onDrop);

  useEffect(() => {
    onDropRef.current = onDrop;
  });

  const sync = useCallback((next: SlotDrag<T> | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const begin = useCallback(
    (source: T, event: React.PointerEvent) => {
      if (event.button !== 0) return;
      // Claiming the pointer keeps events coming to the handle even once the
      // finger has travelled well outside it. Capture is best-effort: it throws
      // if the pointer is already gone, which must not abort the drag.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Fall back to the window listeners, which see the events regardless.
      }
      // Suppresses the click and focus that would otherwise open the recipe.
      event.preventDefault();
      sync({
        source,
        overKey: keyUnder(event.clientX, event.clientY),
        x: event.clientX,
        y: event.clientY,
      });
    },
    [sync]
  );

  const active = drag !== null;

  useEffect(() => {
    if (!active) return;

    const onMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      event.preventDefault();
      sync({
        ...current,
        x: event.clientX,
        y: event.clientY,
        overKey: keyUnder(event.clientX, event.clientY),
      });
    };

    const onUp = (event: PointerEvent) => {
      const current = dragRef.current;
      sync(null);
      if (!current) return;
      // Resolve the target from where the pointer was released rather than from
      // the last move, since a release carries its own position and that is
      // what the user was aiming at.
      const targetKey = keyUnder(event.clientX, event.clientY);
      if (targetKey) onDropRef.current(current.source, targetKey);
    };

    const onCancel = () => sync(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") sync(null);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKeyDown);

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    let frame = requestAnimationFrame(function tick() {
      const current = dragRef.current;
      if (current) {
        const step = edgeScrollStep(current.y, window.innerHeight);
        if (step !== 0) {
          window.scrollBy(0, step);
          // The page moved under a stationary finger, so whatever is under it
          // has changed even though no pointer event fired.
          sync({ ...current, overKey: keyUnder(current.x, current.y) });
        }
      }
      frame = requestAnimationFrame(tick);
    });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [active, sync]);

  return { drag, begin };
}
