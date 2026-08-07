import { describe, expect, it } from "vitest";
import { edgeScrollStep } from "@/components/planner/use-slot-drag";

const VIEWPORT = 800;
const ZONE = 96;
const MAX = 18;

describe("edgeScrollStep", () => {
  it("does not scroll while the pointer is away from both edges", () => {
    expect(edgeScrollStep(400, VIEWPORT)).toBe(0);
    expect(edgeScrollStep(ZONE, VIEWPORT)).toBe(0);
    expect(edgeScrollStep(VIEWPORT - ZONE, VIEWPORT)).toBe(0);
  });

  it("scrolls up inside the top zone and down inside the bottom zone", () => {
    expect(edgeScrollStep(ZONE - 1, VIEWPORT)).toBeLessThan(0);
    expect(edgeScrollStep(VIEWPORT - ZONE + 1, VIEWPORT)).toBeGreaterThan(0);
  });

  it("ramps up as the pointer closes on an edge", () => {
    const near = Math.abs(edgeScrollStep(10, VIEWPORT));
    const mid = Math.abs(edgeScrollStep(50, VIEWPORT));
    const far = Math.abs(edgeScrollStep(90, VIEWPORT));
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
  });

  it("caps the step at the maximum on either edge", () => {
    expect(edgeScrollStep(0, VIEWPORT)).toBe(-MAX);
    expect(edgeScrollStep(VIEWPORT, VIEWPORT)).toBe(MAX);
  });

  it("stays capped when the pointer leaves the viewport entirely", () => {
    // Dragging past the edge of the screen reports coordinates outside it.
    expect(edgeScrollStep(-200, VIEWPORT)).toBe(-MAX);
    expect(edgeScrollStep(VIEWPORT + 200, VIEWPORT)).toBe(MAX);
  });

  it("is symmetric about the middle of the viewport", () => {
    for (const offset of [0, 12, 40, 95]) {
      expect(edgeScrollStep(offset, VIEWPORT)).toBe(
        -edgeScrollStep(VIEWPORT - offset, VIEWPORT)
      );
    }
  });

  it("never exceeds the maximum anywhere in the viewport", () => {
    for (let y = -50; y <= VIEWPORT + 50; y += 7) {
      expect(Math.abs(edgeScrollStep(y, VIEWPORT))).toBeLessThanOrEqual(MAX);
    }
  });

  it("honours a custom zone and maximum", () => {
    expect(edgeScrollStep(0, VIEWPORT, 200, 5)).toBe(-5);
    expect(edgeScrollStep(150, VIEWPORT, 200, 5)).toBeLessThan(0);
    expect(edgeScrollStep(250, VIEWPORT, 200, 5)).toBe(0);
  });

  it("handles a viewport shorter than two zones without dead spots", () => {
    // A small phone in landscape: the zones overlap, and the top one wins.
    expect(edgeScrollStep(40, 150)).toBeLessThan(0);
    expect(edgeScrollStep(140, 150)).toBeGreaterThan(0);
  });
});
