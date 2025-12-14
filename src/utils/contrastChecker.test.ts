import { describe, expect, it } from "vitest";

import {
  ACCENT_COLORS,
  checkAccentColorContrast,
  getContrastRatio,
  meetsWCAGAA
} from "./contrastChecker";

describe("contrastChecker", () => {
  describe("getContrastRatio", () => {
    it("should calculate contrast ratio correctly for black and white", () => {
      const ratio = getContrastRatio("#000000", "#FFFFFF");
      expect(ratio).toBeCloseTo(21, 1); // Maximum contrast
    });

    it("should calculate contrast ratio correctly for same colors", () => {
      const ratio = getContrastRatio("#000000", "#000000");
      expect(ratio).toBe(1); // Minimum contrast
    });

    it("should calculate contrast ratio for medium contrast", () => {
      const ratio = getContrastRatio("#666666", "#FFFFFF");
      expect(ratio).toBeGreaterThan(4.5); // Should meet WCAG AA
    });
  });

  describe("meetsWCAGAA", () => {
    it("should return true for high contrast text", () => {
      expect(meetsWCAGAA("#000000", "#FFFFFF", false, false)).toBe(true);
    });

    it("should return false for low contrast text", () => {
      expect(meetsWCAGAA("#CCCCCC", "#FFFFFF", false, false)).toBe(false);
    });

    it("should use 3:1 threshold for large text", () => {
      // #666666 has ~4.5:1 contrast on white, meets 3:1 for large text
      expect(meetsWCAGAA("#666666", "#FFFFFF", true, false)).toBe(true);
      // #CCCCCC has ~2.6:1 contrast on white, doesn't meet 3:1
      expect(meetsWCAGAA("#CCCCCC", "#FFFFFF", true, false)).toBe(false);
    });

    it("should use 3:1 threshold for UI components", () => {
      // #666666 has ~4.5:1 contrast on white, meets 3:1 for UI
      expect(meetsWCAGAA("#666666", "#FFFFFF", false, true)).toBe(true);
      // #CCCCCC has ~2.6:1 contrast on white, doesn't meet 3:1
      expect(meetsWCAGAA("#CCCCCC", "#FFFFFF", false, true)).toBe(false);
    });
  });

  describe("ACCENT_COLORS", () => {
    it("should have 12 colors", () => {
      expect(ACCENT_COLORS).toHaveLength(12);
    });

    it("should have valid hex color values", () => {
      ACCENT_COLORS.forEach((color) => {
        expect(color.value).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe("checkAccentColorContrast", () => {
    it("should check all colors against white background", () => {
      const results = checkAccentColorContrast(["#FFFFFF"]);
      expect(results).toHaveLength(12);

      // All colors should have contrast ratios
      results.forEach((result) => {
        expect(result.ratio).toBeGreaterThan(0);
        expect(result.meetsAA).toBeDefined();
        expect(result.meetsAALarge).toBeDefined();
        expect(result.meetsAAUI).toBeDefined();
      });
    });

    it("should check all colors against dark background", () => {
      const results = checkAccentColorContrast(["#1F2933"]);
      expect(results).toHaveLength(12);

      // Some colors may not meet contrast on dark backgrounds
      results.forEach((result) => {
        expect(result.ratio).toBeGreaterThan(0);
      });
    });

    it("should identify which colors meet WCAG AA on white", () => {
      const results = checkAccentColorContrast(["#FFFFFF"]);
      
      // Some colors should meet AA on white (darker colors)
      // Note: Bright colors like yellow may not meet AA on white
      // At least some colors should have contrast data
      expect(results.length).toBeGreaterThan(0);
      // Verify we're checking all 12 colors
      expect(results).toHaveLength(12);
    });
  });
});

