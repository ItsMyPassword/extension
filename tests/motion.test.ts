import { describe, it, expect } from "vitest";

import {
  SOFT_SPRING,
  BOUNCY_SPRING,
  FADE_RISE,
  POP_IN,
  TAP_SCALE,
  HOVER_LIFT,
} from "../src/shared/motion.js";

describe("motion presets", () => {
  it("springs use the spring type with positive physical params", () => {
    for (const spring of [SOFT_SPRING, BOUNCY_SPRING]) {
      const cfg = spring as { type?: string; stiffness?: number; damping?: number; mass?: number };
      expect(cfg.type).toBe("spring");
      expect(cfg.stiffness ?? 0).toBeGreaterThan(0);
      expect(cfg.damping ?? 0).toBeGreaterThan(0);
      expect(cfg.mass ?? 0).toBeGreaterThan(0);
    }
  });

  it("variant presets expose initial/animate/exit states", () => {
    for (const variants of [FADE_RISE, POP_IN]) {
      expect(variants).toHaveProperty("initial");
      expect(variants).toHaveProperty("animate");
      expect(variants).toHaveProperty("exit");
    }
  });

  it("interaction presets carry the expected transforms", () => {
    expect(TAP_SCALE).toEqual({ scale: 0.96 });
    expect(HOVER_LIFT).toEqual({ y: -1 });
  });
});
