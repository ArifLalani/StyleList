import type { ColorOption } from "./types";

/**
 * The colour vocabulary Style List uses everywhere: the colour picker, the
 * generated garment illustrations and the stylist's colour matching.
 * Deliberately short - people describe clothes with a handful of words.
 */
export const COLORS: ColorOption[] = [
  { name: "Black", hex: "#17181B", family: "neutral" },
  { name: "Charcoal", hex: "#3A3D42", family: "neutral" },
  { name: "Grey", hex: "#8E9196", family: "neutral" },
  { name: "Light Grey", hex: "#C7C9CD", family: "neutral" },
  { name: "White", hex: "#F7F7F5", family: "neutral" },
  { name: "Cream", hex: "#EDE6D8", family: "warm" },
  { name: "Beige", hex: "#D6C7B0", family: "warm" },
  { name: "Brown", hex: "#6B513C", family: "warm" },
  { name: "Tan", hex: "#B79B76", family: "warm" },
  { name: "Navy", hex: "#22304A", family: "cool" },
  { name: "Blue", hex: "#3E6DA8", family: "cool" },
  { name: "Light Blue", hex: "#9DBBD8", family: "cool" },
  { name: "Green", hex: "#3F5D45", family: "cool" },
  { name: "Olive", hex: "#6B6B45", family: "warm" },
  { name: "Red", hex: "#8E2B28", family: "bright" },
  { name: "Burgundy", hex: "#5A2230", family: "bright" },
  { name: "Pink", hex: "#D8A5AE", family: "bright" },
  { name: "Purple", hex: "#54406B", family: "bright" },
  { name: "Yellow", hex: "#D8B44A", family: "bright" },
  { name: "Orange", hex: "#C4703A", family: "bright" },
];

export function colorOption(name?: string): ColorOption {
  if (!name) return COLORS[0];
  const match = COLORS.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return match ?? { name, hex: "#8E9196", family: "neutral" };
}

export function colorHex(name?: string): string {
  return colorOption(name).hex;
}

/* ------------------------------------------------------------------ */
/* Hex helpers - used by the garment illustrations and the photo tools */
/* ------------------------------------------------------------------ */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** amount > 0 lightens, amount < 0 darkens. Range roughly -1..1. */
export function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return rgbToHex(r + (mix - r) * t, g + (mix - g) * t, b + (mix - b) * t);
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function isLight(hex: string): boolean {
  return luminance(hex) > 0.62;
}

/** Nearest named colour for an arbitrary RGB sample from a photo. */
export function nearestColorName(r: number, g: number, b: number): string {
  let best = COLORS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const option of COLORS) {
    const c = hexToRgb(option.hex);
    const distance =
      (c.r - r) * (c.r - r) * 0.3 + (c.g - g) * (c.g - g) * 0.59 + (c.b - b) * (c.b - b) * 0.11;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = option;
    }
  }
  return best.name;
}

/**
 * How well two colours sit together in an outfit. 0-1.
 * Neutrals go with everything; one accent colour is fine; two fight.
 */
export function colorHarmony(a: string, b: string): number {
  const ca = colorOption(a);
  const cb = colorOption(b);
  if (ca.family === "neutral" && cb.family === "neutral") {
    const contrast = Math.abs(luminance(ca.hex) - luminance(cb.hex));
    return contrast > 0.08 ? 1 : 0.85;
  }
  if (ca.family === "neutral" || cb.family === "neutral") return 0.95;
  if (ca.family === cb.family) return 0.7;
  if (ca.family === "bright" && cb.family === "bright") return 0.35;
  return 0.55;
}
