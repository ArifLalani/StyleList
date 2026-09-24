"use client";

import { nearestColorName } from "@/lib/colors";
import type { Category, Pattern, Season } from "@/lib/types";
import { CATEGORY_GROUP_OF, type CategoryGroup } from "@/lib/types";
import { aiCapabilities, loadBitmap } from "./imageProcessing";

/**
 * analyzeClothingItem() - suggest what the photo shows so the person confirms
 * instead of typing.
 *
 * As with image processing there are two paths behind one interface. When a
 * vision service is configured, `/api/ai/analyze` returns a full read of the
 * garment including a brand guess. Otherwise Style List measures what it can
 * measure honestly from the pixels: the real dominant colours, the silhouette,
 * and whether the surface is plain, striped or printed.
 *
 * On-device analysis never guesses a brand or a material. An empty field the
 * person can fill in is better than a confident invention they have to notice
 * and correct.
 */

export interface ItemSuggestion {
  name: string;
  category: Category;
  subcategory?: string;
  /** The broad group, which is what the on-device read is actually sure of. */
  group: CategoryGroup;
  primaryColor: string;
  secondaryColor?: string;
  pattern: Pattern;
  season: Season;
  brand?: string;
  material?: string;
  description?: string;
  warmth: number;
  dressiness: number;
  confidence: {
    category: number;
    color: number;
  };
  source: "on-device" | "assistant";
}

export interface AnalyzeOptions {
  /** The cleaned-up image, when there is one: its cut-out is far easier to read. */
  processed?: Blob;
  original: Blob;
  signal?: AbortSignal;
}

export async function analyzeClothingItem(options: AnalyzeOptions): Promise<ItemSuggestion> {
  const capabilities = await aiCapabilities();
  if (capabilities.itemAnalysis) {
    try {
      const remote = await analyzeRemotely(options);
      if (remote) return remote;
    } catch {
      // Fall through: a missed analysis must never block adding an item.
    }
  }
  return analyzeOnDevice(options);
}

async function analyzeRemotely(options: AnalyzeOptions): Promise<ItemSuggestion | null> {
  const body = new FormData();
  body.append("image", options.processed ?? options.original);
  const response = await fetch("/api/ai/analyze", {
    method: "POST",
    body,
    signal: options.signal,
  });
  if (!response.ok) return null;
  const json = (await response.json()) as Partial<ItemSuggestion> | null;
  if (!json?.category) return null;

  const category = json.category;
  const primaryColor = json.primaryColor ?? "Black";
  return {
    name: json.name ?? defaultName(primaryColor, category, json.brand),
    category,
    subcategory: json.subcategory,
    group: CATEGORY_GROUP_OF[category],
    primaryColor,
    secondaryColor: json.secondaryColor,
    pattern: json.pattern ?? "Solid",
    season: json.season ?? seasonFor(category),
    brand: json.brand,
    material: json.material,
    description: json.description,
    warmth: json.warmth ?? warmthFor(category, json.material),
    dressiness: json.dressiness ?? dressinessFor(category),
    confidence: json.confidence ?? { category: 0.85, color: 0.85 },
    source: "assistant",
  };
}

/* ------------------------------------------------------------------ */
/* On-device read                                                      */
/* ------------------------------------------------------------------ */

const GRID = 160;

export async function analyzeOnDevice(options: AnalyzeOptions): Promise<ItemSuggestion> {
  const blob = options.processed ?? options.original;
  const sample = await sampleImage(blob);

  if (!sample) {
    return {
      name: "New item",
      category: "Other",
      group: "Accessories",
      primaryColor: "Black",
      pattern: "Solid",
      season: "All Year",
      warmth: 2,
      dressiness: 2,
      confidence: { category: 0, color: 0 },
      source: "on-device",
    };
  }

  const colors = dominantColors(sample);
  const shape = readSilhouette(sample);
  const pattern = readPattern(sample, colors);

  const category = shape.category;
  const primaryColor = colors.primary;
  const secondaryColor = colors.secondary;

  return {
    name: defaultName(primaryColor, category),
    category,
    subcategory: undefined,
    group: CATEGORY_GROUP_OF[category],
    primaryColor,
    secondaryColor,
    pattern,
    season: seasonFor(category),
    warmth: warmthFor(category),
    dressiness: dressinessFor(category),
    confidence: { category: shape.confidence, color: colors.confidence },
    source: "on-device",
  };
}

interface Sample {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  /** True where the garment is, from the cut-out alpha or a centre crop. */
  mask: Uint8Array;
  maskArea: number;
  bounds: { left: number; top: number; right: number; bottom: number };
  /** False when we had to fall back to guessing the subject area. */
  hasCutout: boolean;
}

async function sampleImage(blob: Blob): Promise<Sample | null> {
  if (typeof document === "undefined") return null;
  const bitmap = await loadBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = GRID;
  canvas.height = GRID;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close?.();
    return null;
  }
  /* Letterbox so the aspect ratio of the garment survives the resample. */
  const scale = Math.min(GRID / bitmap.width, GRID / bitmap.height);
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  ctx.clearRect(0, 0, GRID, GRID);
  ctx.drawImage(bitmap, (GRID - drawWidth) / 2, (GRID - drawHeight) / 2, drawWidth, drawHeight);
  bitmap.close?.();

  const image = ctx.getImageData(0, 0, GRID, GRID);
  const mask = new Uint8Array(GRID * GRID);
  let maskArea = 0;
  let left = GRID;
  let right = 0;
  let top = GRID;
  let bottom = 0;
  let transparent = 0;

  for (let i = 0; i < mask.length; i += 1) {
    if (image.data[i * 4 + 3] < 24) transparent += 1;
  }
  const hasCutout = transparent > mask.length * 0.08;

  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const index = y * GRID + x;
      const alpha = image.data[index * 4 + 3];
      const inside = hasCutout
        ? alpha > 140
        : /* No cut-out: read the middle of the frame, where people put the item. */
          x > GRID * 0.18 && x < GRID * 0.82 && y > GRID * 0.12 && y < GRID * 0.88 && alpha > 10;
      if (!inside) continue;
      mask[index] = 1;
      maskArea += 1;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (maskArea < 40) return null;
  return {
    width: GRID,
    height: GRID,
    data: image.data,
    mask,
    maskArea,
    bounds: { left, top, right, bottom },
    hasCutout,
  };
}

/* ---- colour ------------------------------------------------------- */

interface ColorRead {
  primary: string;
  secondary?: string;
  confidence: number;
}

/**
 * Buckets the garment's pixels into the app's own colour vocabulary and takes
 * the winner. Working in named buckets rather than raw averages is what stops
 * a black hoodie with a white logo from being reported as dark grey.
 */
function dominantColors(sample: Sample): ColorRead {
  const counts = new Map<string, { count: number; r: number; g: number; b: number }>();
  for (let index = 0; index < sample.mask.length; index += 1) {
    if (!sample.mask[index]) continue;
    const offset = index * 4;
    const r = sample.data[offset];
    const g = sample.data[offset + 1];
    const b = sample.data[offset + 2];
    const name = nearestColorName(r, g, b);
    const bucket = counts.get(name) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    counts.set(name, bucket);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1].count - a[1].count);
  if (!ranked.length) return { primary: "Black", confidence: 0 };

  const [primaryName, primaryBucket] = ranked[0];
  const share = primaryBucket.count / sample.maskArea;

  /* Merge near-identical neutrals so "Grey" and "Light Grey" do not split a vote. */
  const secondaryEntry = ranked
    .slice(1)
    .find(([name, bucket]) => bucket.count / sample.maskArea > 0.14 && !similarName(name, primaryName));

  return {
    primary: primaryName,
    secondary: secondaryEntry?.[0],
    confidence: Math.min(1, share * 1.4),
  };
}

function similarName(a: string, b: string) {
  const pairs = [
    ["Grey", "Light Grey"],
    ["Grey", "Charcoal"],
    ["Charcoal", "Black"],
    ["White", "Cream"],
    ["Cream", "Beige"],
    ["Beige", "Tan"],
    ["Navy", "Blue"],
  ];
  return pairs.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x),
  );
}

/* ---- silhouette --------------------------------------------------- */

interface ShapeRead {
  category: Category;
  confidence: number;
}

/**
 * Reads the outline: how tall it is, whether it has sleeves poking out at the
 * shoulders, and whether the bottom splits into two legs. That is enough to
 * place the item in the right group nearly every time, which is what matters -
 * the confirm screen turns the exact category into one tap.
 */
function readSilhouette(sample: Sample): ShapeRead {
  const { bounds, mask, width } = sample;
  const boxWidth = bounds.right - bounds.left + 1;
  const boxHeight = bounds.bottom - bounds.top + 1;
  const aspect = boxHeight / boxWidth;
  const fill = sample.maskArea / (boxWidth * boxHeight);

  const rowProfile = (fraction: number) => {
    const y = Math.min(bounds.bottom, Math.max(bounds.top, Math.round(bounds.top + boxHeight * fraction)));
    let filled = 0;
    let runs = 0;
    let previous = 0;
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      const value = mask[y * width + x];
      if (value) filled += 1;
      if (value && !previous) runs += 1;
      previous = value;
    }
    return { coverage: filled / boxWidth, runs };
  };

  const shoulders = rowProfile(0.16);
  const waist = rowProfile(0.5);
  const hem = rowProfile(0.9);

  /* Two separate runs low down means legs. */
  const hasLegs = hem.runs >= 2 && aspect > 0.85;
  /* A wide top that narrows below is a sleeve spread. */
  const hasSleeves = shoulders.coverage > 0.72 && waist.coverage < shoulders.coverage * 0.92;

  if (aspect < 0.66 && fill > 0.42) {
    return { category: "Shoes", confidence: 0.72 };
  }
  if (hasLegs) {
    if (aspect > 1.35) return { category: "Jeans", confidence: 0.68 };
    return { category: "Shorts", confidence: 0.6 };
  }
  if (hasSleeves) {
    if (aspect > 1.12) return { category: "Hoodie", confidence: 0.55 };
    return { category: "T-Shirt", confidence: 0.58 };
  }
  if (aspect > 1.3) {
    return { category: "Pants", confidence: 0.45 };
  }
  if (aspect < 0.85) {
    return { category: "Hat", confidence: 0.4 };
  }
  return { category: "T-Shirt", confidence: 0.35 };
}

/* ---- pattern ------------------------------------------------------ */

function readPattern(sample: Sample, colors: ColorRead): Pattern {
  if (!colors.secondary) return "Solid";

  /* Count how often the row's average brightness flips direction: regular
     flipping across the whole garment is a stripe, a single blob is a print. */
  const { bounds, mask, data, width } = sample;
  const rowMeans: number[] = [];
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    let sum = 0;
    let count = 0;
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      const index = y * width + x;
      if (!mask[index]) continue;
      const offset = index * 4;
      sum += 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
      count += 1;
    }
    if (count > 4) rowMeans.push(sum / count);
  }

  if (rowMeans.length > 12) {
    const mean = rowMeans.reduce((a, b) => a + b, 0) / rowMeans.length;
    let crossings = 0;
    let previousAbove = rowMeans[0] > mean;
    for (const value of rowMeans) {
      const above = value > mean;
      if (above !== previousAbove) crossings += 1;
      previousAbove = above;
    }
    if (crossings >= 6) return "Striped";
  }

  return "Graphic";
}

/* ------------------------------------------------------------------ */
/* Sensible defaults derived from the category                         */
/* ------------------------------------------------------------------ */

export function defaultName(color: string, category: Category, brand?: string): string {
  return [color, brand, category].filter(Boolean).join(" ");
}

export function warmthFor(category: Category, material?: string): number {
  const base: Record<Category, number> = {
    "T-Shirt": 1,
    Shirt: 2,
    Hoodie: 4,
    Sweater: 4,
    Jacket: 3,
    Coat: 5,
    Jeans: 3,
    Pants: 3,
    Sweatpants: 3,
    Shorts: 1,
    Shoes: 2,
    Hat: 1,
    Bag: 1,
    Other: 2,
  };
  let warmth = base[category] ?? 2;
  const text = (material ?? "").toLowerCase();
  if (/(wool|fleece|down|shearling|puffer)/.test(text)) warmth = Math.min(5, warmth + 1);
  if (/(linen|mesh)/.test(text)) warmth = Math.max(1, warmth - 1);
  return warmth;
}

export function dressinessFor(category: Category): number {
  const base: Record<Category, number> = {
    "T-Shirt": 2,
    Shirt: 4,
    Hoodie: 1,
    Sweater: 3,
    Jacket: 3,
    Coat: 4,
    Jeans: 3,
    Pants: 3,
    Sweatpants: 1,
    Shorts: 1,
    Shoes: 2,
    Hat: 1,
    Bag: 2,
    Other: 2,
  };
  return base[category] ?? 2;
}

export function seasonFor(category: Category): Season {
  if (category === "Coat") return "Winter";
  if (category === "Shorts") return "Summer";
  return "All Year";
}
