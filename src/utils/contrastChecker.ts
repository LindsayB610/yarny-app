/**
 * Contrast checking utilities for WCAG compliance
 * WCAG 2.1 Level AA requires:
 * - 4.5:1 contrast ratio for normal text (under 18pt or 14pt bold)
 * - 3:1 contrast ratio for large text (18pt+ or 14pt+ bold) and UI components
 */

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 formula
 */
function getLuminance(hex: string): number {
  // Remove # if present
  const color = hex.replace("#", "");
  
  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16) / 255;
  const g = parseInt(color.substring(2, 4), 16) / 255;
  const b = parseInt(color.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const [rLinear, gLinear, bLinear] = [r, g, b].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param foreground - Foreground color (text)
 * @param background - Background color
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @param isUIComponent - Whether it's a UI component (requires 3:1)
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText = false,
  isUIComponent = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  
  if (isUIComponent) {
    return ratio >= 3.0;
  }
  
  if (isLargeText) {
    return ratio >= 3.0;
  }
  
  return ratio >= 4.5;
}

/**
 * The 12 accent colors used in Yarny
 */
export const ACCENT_COLORS = [
  { name: "red", value: "#EF4444" },
  { name: "orange", value: "#F97316" },
  { name: "amber", value: "#F59E0B" },
  { name: "yellow", value: "#EAB308" },
  { name: "lime", value: "#84CC16" },
  { name: "emerald", value: "#10B981" },
  { name: "teal", value: "#14B8A6" },
  { name: "cyan", value: "#06B6D4" },
  { name: "blue", value: "#3B82F6" },
  { name: "indigo", value: "#6366F1" },
  { name: "violet", value: "#8B5CF6" },
  { name: "fuchsia", value: "#D946EF" }
] as const;

/**
 * Normalize a hex color string to the format #RRGGBB
 */
function normalizeHex(color: string, fallback = "#000000"): string {
  if (!color) {
    return fallback;
  }

  let hex = color.trim().replace("#", "");

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return fallback;
  }

  return `#${hex.toUpperCase()}`;
}

/**
 * Blend two colors together
 */
function blendColors(color1: string, color2: string, amount: number): string {
  const ratio = Math.min(Math.max(amount, 0), 1);
  const c1 = normalizeHex(color1);
  const c2 = normalizeHex(color2);

  const r1 = parseInt(c1.substring(1, 3), 16);
  const g1 = parseInt(c1.substring(3, 5), 16);
  const b1 = parseInt(c1.substring(5, 7), 16);

  const r2 = parseInt(c2.substring(1, 3), 16);
  const g2 = parseInt(c2.substring(3, 5), 16);
  const b2 = parseInt(c2.substring(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function lightenColor(color: string, amount = 0.2): string {
  return blendColors(color, "#FFFFFF", amount);
}

export function darkenColor(color: string, amount = 0.2): string {
  return blendColors(color, "#000000", amount);
}

/**
 * Generate soft variant of a color (lighter, more transparent)
 */
export function getSoftVariant(color: string): string {
  // Blend heavily with white to create a soft pastel background
  return lightenColor(color, 0.75);
}

/**
 * Generate dark variant of a color (darker) for hover states
 */
export function getDarkVariant(color: string): string {
  return darkenColor(color, 0.25);
}

const DEFAULT_LIGHT_TEXT = "#FFFFFF";
const DEFAULT_DARK_TEXT = "#0F172A";

/**
 * Select a readable text color (light or dark) for a given background
 */
export function getReadableTextColor(
  background: string,
  {
    light = DEFAULT_LIGHT_TEXT,
    dark = DEFAULT_DARK_TEXT,
    minimumRatio = 4.5
  }: {
    light?: string;
    dark?: string;
    minimumRatio?: number;
  } = {}
): string {
  const bg = normalizeHex(background);
  const lightColor = normalizeHex(light);
  const darkColor = normalizeHex(dark);

  const lightRatio = getContrastRatio(lightColor, bg);
  const darkRatio = getContrastRatio(darkColor, bg);

  const lightMeets = lightRatio >= minimumRatio;
  const darkMeets = darkRatio >= minimumRatio;

  if (lightMeets && darkMeets) {
    return lightRatio >= darkRatio ? lightColor : darkColor;
  }

  if (lightMeets) {
    return lightColor;
  }

  if (darkMeets) {
    return darkColor;
  }

  // Fallback to the color with higher contrast even if it doesn't meet the minimum ratio
  return lightRatio >= darkRatio ? lightColor : darkColor;
}

/**
 * Check contrast for all accent colors against common backgrounds
 * @param backgrounds - Array of background colors to test against
 */
export function checkAccentColorContrast(backgrounds: string[]): Array<{
  color: string;
  name: string;
  background: string;
  ratio: number;
  meetsAA: boolean;
  meetsAALarge: boolean;
  meetsAAUI: boolean;
}> {
  const results: Array<{
    color: string;
    name: string;
    background: string;
    ratio: number;
    meetsAA: boolean;
    meetsAALarge: boolean;
    meetsAAUI: boolean;
  }> = [];

  for (const accent of ACCENT_COLORS) {
    for (const bg of backgrounds) {
      const ratio = getContrastRatio(accent.value, bg);
      results.push({
        color: accent.value,
        name: accent.name,
        background: bg,
        ratio,
        meetsAA: meetsWCAGAA(accent.value, bg, false, false),
        meetsAALarge: meetsWCAGAA(accent.value, bg, true, false),
        meetsAAUI: meetsWCAGAA(accent.value, bg, false, true)
      });
    }
  }

  return results;
}

