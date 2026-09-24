"use client";

import type { ImageProcessor } from "@/lib/types";

/**
 * processClothingImage() - turn a quick phone snap into a clean flat-lay.
 *
 * Two paths, one interface:
 *
 *  1. A remote image service, when one is configured. `/api/ai/process-image`
 *     reports whether the deployment has one and proxies to it. Nothing in the
 *     UI knows or cares which vendor that is.
 *  2. On-device processing, which is what runs by default. This is real work
 *     done in a canvas - it lifts the garment off a plain background, keeps the
 *     largest subject, straightens it, crops and centres it and evens out the
 *     lighting. It is honest about what it is: Settings calls it
 *     "On-device cleanup" and never claims a cloud model touched the photo.
 *
 * The garment itself is never redrawn. Every step is a crop, a rotation, an
 * alpha mask or a global tone curve, so logos, prints, stitching and wear all
 * survive exactly as photographed. When the picture is too busy to read
 * confidently, the processor gives up and the original photo is kept.
 */

export type ProcessingStepName =
  | "Getting your item ready"
  | "Removing background"
  | "Straightening item"
  | "Evening out the lighting"
  | "Finishing up";

export interface ProcessClothingImageResult {
  /** The cleaned-up image, or the original when processing was not confident. */
  blob: Blob;
  width: number;
  height: number;
  /** 0-1. How cleanly the garment was separated from its surroundings. */
  confidence: number;
  processor: ImageProcessor;
  /** True when we kept the original photo instead of a cleaned-up version. */
  usedOriginal: boolean;
  note?: string;
}

export interface ProcessOptions {
  onStep?: (step: ProcessingStepName) => void;
  signal?: AbortSignal;
  /** Output edge length in pixels. */
  size?: number;
}

/* ------------------------------------------------------------------ */
/* Remote provider discovery                                           */
/* ------------------------------------------------------------------ */

export interface AiCapabilities {
  imageProcessing: boolean;
  itemAnalysis: boolean;
  tryOn: boolean;
  /** Friendly provider name for Settings, when one is connected. */
  imageProviderName?: string;
  analysisProviderName?: string;
}

let capabilitiesPromise: Promise<AiCapabilities> | null = null;

export function aiCapabilities(): Promise<AiCapabilities> {
  if (!capabilitiesPromise) {
    capabilitiesPromise = fetch("/api/ai/status")
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (json): AiCapabilities =>
          json ?? { imageProcessing: false, itemAnalysis: false, tryOn: false },
      )
      .catch(() => ({ imageProcessing: false, itemAnalysis: false, tryOn: false }));
  }
  return capabilitiesPromise;
}

export function refreshAiCapabilities(): void {
  capabilitiesPromise = null;
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export async function processClothingImage(
  source: Blob,
  options: ProcessOptions = {},
): Promise<ProcessClothingImageResult> {
  const { onStep } = options;
  onStep?.("Getting your item ready");

  const capabilities = await aiCapabilities();
  if (capabilities.imageProcessing) {
    try {
      const remote = await processRemotely(source, options);
      if (remote) return remote;
    } catch {
      // Fall through to on-device processing rather than failing the add flow.
    }
  }

  return processOnDevice(source, options);
}

async function processRemotely(
  source: Blob,
  options: ProcessOptions,
): Promise<ProcessClothingImageResult | null> {
  const body = new FormData();
  body.append("image", source);
  const response = await fetch("/api/ai/process-image", {
    method: "POST",
    body,
    signal: options.signal,
  });
  if (!response.ok) return null;
  const blob = await response.blob();
  const size = await blobDimensions(blob);
  return {
    blob,
    width: size.width,
    height: size.height,
    confidence: Number(response.headers.get("x-confidence") ?? 0.9),
    processor: "remote",
    usedOriginal: false,
  };
}

/* ------------------------------------------------------------------ */
/* On-device processing                                                */
/* ------------------------------------------------------------------ */

const WORKING_SIZE = 1100;
const OUTPUT_SIZE = 1024;
/** Share of the output square the garment is allowed to fill. */
const FILL_RATIO = 0.86;

export async function processOnDevice(
  source: Blob,
  options: ProcessOptions = {},
): Promise<ProcessClothingImageResult> {
  const { onStep, size = OUTPUT_SIZE } = options;

  const bitmap = await loadBitmap(source);
  const scale = Math.min(1, WORKING_SIZE / Math.max(bitmap.width, bitmap.height));
  const workWidth = Math.max(1, Math.round(bitmap.width * scale));
  const workHeight = Math.max(1, Math.round(bitmap.height * scale));

  const work = createCanvas(workWidth, workHeight);
  const workCtx = work.getContext("2d", { willReadFrequently: true });
  if (!workCtx) return keepOriginal(source, bitmap, "Canvas is unavailable in this browser.");
  workCtx.drawImage(bitmap, 0, 0, workWidth, workHeight);

  const pixels = workCtx.getImageData(0, 0, workWidth, workHeight);

  onStep?.("Removing background");
  const mask = separateGarment(pixels);

  if (!mask) {
    return keepOriginal(source, bitmap, "The background was too busy to remove cleanly.");
  }

  onStep?.("Straightening item");
  const angle = principalAngle(mask, workWidth, workHeight);

  onStep?.("Evening out the lighting");
  const tone = toneAdjustment(pixels, mask.alpha);

  onStep?.("Finishing up");
  const cleaned = compose({
    bitmap,
    mask,
    pixels,
    workWidth,
    workHeight,
    sourceWidth: bitmap.width,
    sourceHeight: bitmap.height,
    angle,
    tone,
    size,
  });

  if (!cleaned) return keepOriginal(source, bitmap, "Could not build a clean image.");

  const blob = await canvasToBlob(cleaned);
  bitmap.close?.();

  return {
    blob,
    width: size,
    height: size,
    confidence: mask.confidence,
    processor: "on-device",
    usedOriginal: false,
  };
}

async function keepOriginal(
  source: Blob,
  bitmap: ImageBitmap,
  note: string,
): Promise<ProcessClothingImageResult> {
  const result: ProcessClothingImageResult = {
    blob: source,
    width: bitmap.width,
    height: bitmap.height,
    confidence: 0,
    processor: "none",
    usedOriginal: true,
    note,
  };
  bitmap.close?.();
  return result;
}

/* ------------------------------------------------------------------ */
/* Step 1 - separate the garment from its surroundings                 */
/* ------------------------------------------------------------------ */

interface GarmentMask {
  /** 0-255 per pixel: 255 is garment. */
  alpha: Uint8ClampedArray;
  bounds: { left: number; top: number; right: number; bottom: number };
  confidence: number;
}

/**
 * Flood fills inwards from the edges of the photo. Anything reachable from the
 * border in a similar colour is the bed, floor or wall; everything else is the
 * item. Filling from the border (rather than keying on colour alone) is what
 * protects a white logo in the middle of a black hoodie.
 */
function separateGarment(image: ImageData): GarmentMask | null {
  const { width, height, data } = image;
  const total = width * height;

  const background = sampleBackground(image);
  const tolerance = 34 + background.spread * 1.4;

  const isBackground = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const pushIfBackground = (index: number) => {
    if (isBackground[index]) return;
    const offset = index * 4;
    const distance = colorDistance(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      background.r,
      background.g,
      background.b,
    );
    if (distance <= tolerance) {
      isBackground[index] = 1;
      queue[tail++] = index;
    }
  };

  for (let x = 0; x < width; x += 1) {
    pushIfBackground(x);
    pushIfBackground((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    pushIfBackground(y * width);
    pushIfBackground(y * width + width - 1);
  }

  const borderCount = width * 2 + height * 2;
  const borderMatched = tail;

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) pushIfBackground(index - 1);
    if (x < width - 1) pushIfBackground(index + 1);
    if (y > 0) pushIfBackground(index - width);
    if (y < height - 1) pushIfBackground(index + width);
  }

  /* Keep only the largest remaining blob: that is the garment, not the phone
     or the mug that happened to be lying next to it. */
  const label = new Int32Array(total).fill(-1);
  let bestLabel = -1;
  let bestSize = 0;
  let nextLabel = 0;
  const stack = new Int32Array(total);

  for (let start = 0; start < total; start += 1) {
    if (isBackground[start] || label[start] !== -1) continue;
    let size = 0;
    let top = 0;
    stack[top++] = start;
    label[start] = nextLabel;
    while (top > 0) {
      const index = stack[--top];
      size += 1;
      const x = index % width;
      const y = (index - x) / width;
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour < 0 || isBackground[neighbour] || label[neighbour] !== -1) continue;
        label[neighbour] = nextLabel;
        stack[top++] = neighbour;
      }
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = nextLabel;
    }
    nextLabel += 1;
  }

  const areaRatio = bestSize / total;
  const borderMatch = borderMatched / borderCount;

  /* Bail out when the photo does not look like an item on a plain surface. */
  if (areaRatio < 0.02 || areaRatio > 0.94 || borderMatch < 0.45) return null;

  const alpha = new Uint8ClampedArray(total);
  let left = width;
  let right = 0;
  let top = height;
  let bottom = 0;

  for (let index = 0; index < total; index += 1) {
    if (label[index] !== bestLabel) continue;
    alpha[index] = 255;
    const x = index % width;
    const y = (index - x) / width;
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }

  /* Close pinholes (buttons, mesh, gaps between laces) so the garment does not
     end up see-through, then soften the outline by one pixel. */
  fillInteriorHoles(alpha, width, height);
  const feathered = feather(alpha, width, height);

  const confidence = clamp(
    0.35 * borderMatch + 0.4 * edgeContrast(image, feathered) + 0.25 * shapePlausibility(areaRatio),
    0,
    1,
  );

  return { alpha: feathered, bounds: { left, top, right, bottom }, confidence };
}

function sampleBackground(image: ImageData) {
  const { width, height, data } = image;
  const samples: number[][] = [];
  const step = Math.max(1, Math.round(Math.min(width, height) / 60));
  const record = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    samples.push([data[offset], data[offset + 1], data[offset + 2]]);
  };
  for (let x = 0; x < width; x += step) {
    record(x, 0);
    record(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    record(0, y);
    record(width - 1, y);
  }
  const median = (channel: number) => {
    const values = samples.map((s) => s[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 0;
  };
  const r = median(0);
  const g = median(1);
  const b = median(2);
  const spread =
    samples.reduce((sum, s) => sum + colorDistance(s[0], s[1], s[2], r, g, b), 0) /
    Math.max(1, samples.length);
  return { r, g, b, spread };
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.9);
}

/** Any background-coloured region that never touches the frame is a hole. */
function fillInteriorHoles(alpha: Uint8ClampedArray, width: number, height: number) {
  const total = width * height;
  const outside = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const push = (index: number) => {
    if (outside[index] || alpha[index] > 0) return;
    outside[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }
  for (let index = 0; index < total; index += 1) {
    if (!alpha[index] && !outside[index]) alpha[index] = 255;
  }
}

function feather(alpha: Uint8ClampedArray, width: number, height: number) {
  const output = new Uint8ClampedArray(alpha.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          sum += alpha[ny * width + nx];
          count += 1;
        }
      }
      output[index] = sum / count;
    }
  }
  return output;
}

/** Strong contrast along the cut line means the cut followed a real edge. */
function edgeContrast(image: ImageData, alpha: Uint8ClampedArray) {
  const { width, height, data } = image;
  let samples = 0;
  let total = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const index = y * width + x;
      const value = alpha[index];
      if (value < 40 || value > 215) continue;
      const offset = index * 4;
      const inside = (y * width + Math.min(width - 1, x + 2)) * 4;
      total += colorDistance(
        data[offset],
        data[offset + 1],
        data[offset + 2],
        data[inside],
        data[inside + 1],
        data[inside + 2],
      );
      samples += 1;
    }
  }
  if (!samples) return 0.5;
  return clamp(total / samples / 90, 0, 1);
}

function shapePlausibility(areaRatio: number) {
  if (areaRatio < 0.06) return 0.35;
  if (areaRatio > 0.8) return 0.5;
  return 1;
}

/* ------------------------------------------------------------------ */
/* Step 2 - straighten                                                 */
/* ------------------------------------------------------------------ */

/**
 * Second-order image moments give the garment's long axis. Rotating that axis
 * upright is what makes a hoodie thrown on a bed look like a catalog shot.
 * Only small corrections are applied - a deliberately angled shot is left be.
 */
function principalAngle(mask: GarmentMask, width: number, height: number): number {
  const { alpha } = mask;
  let m00 = 0;
  let m10 = 0;
  let m01 = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const value = alpha[y * width + x];
      if (value < 128) continue;
      m00 += 1;
      m10 += x;
      m01 += y;
    }
  }
  if (m00 < 50) return 0;
  const cx = m10 / m00;
  const cy = m01 / m00;

  let mu20 = 0;
  let mu02 = 0;
  let mu11 = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (alpha[y * width + x] < 128) continue;
      const dx = x - cx;
      const dy = y - cy;
      mu20 += dx * dx;
      mu02 += dy * dy;
      mu11 += dx * dy;
    }
  }
  mu20 /= m00;
  mu02 /= m00;
  mu11 /= m00;

  /* Angle of the long axis, measured from the x axis. */
  const theta = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
  const elongation = Math.abs(mu20 - mu02) / Math.max(1, mu20 + mu02);

  /* A near-square silhouette (a folded tee, a cap) has no meaningful axis. */
  if (elongation < 0.12) return 0;

  const isTall = mu02 > mu20;
  /* Correction that brings the long axis to vertical (tall) or horizontal. */
  let correction = isTall ? -(theta + Math.PI / 2) : -theta;
  while (correction > Math.PI / 2) correction -= Math.PI;
  while (correction < -Math.PI / 2) correction += Math.PI;

  const degrees = (correction * 180) / Math.PI;
  if (Math.abs(degrees) < 1.5 || Math.abs(degrees) > 18) return 0;
  return correction;
}

/* ------------------------------------------------------------------ */
/* Step 3 - even out the lighting                                      */
/* ------------------------------------------------------------------ */

interface ToneAdjustment {
  gain: number;
  offset: number;
  whiteBalance: [number, number, number];
}

/**
 * A gentle global curve only: stretch the garment's own tonal range so a photo
 * taken in a dim room reads properly, and neutralise a colour cast measured on
 * the background. Nothing local, nothing that could invent detail.
 */
function toneAdjustment(image: ImageData, alpha: Uint8ClampedArray): ToneAdjustment {
  const { width, height, data } = image;
  const histogram = new Uint32Array(256);
  let count = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let backgroundCount = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = y * width + x;
      const offset = index * 4;
      if (alpha[index] > 200) {
        const luma = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
        histogram[Math.round(luma)] += 1;
        count += 1;
      } else if (alpha[index] < 20) {
        rSum += data[offset];
        gSum += data[offset + 1];
        bSum += data[offset + 2];
        backgroundCount += 1;
      }
    }
  }

  let whiteBalance: [number, number, number] = [1, 1, 1];
  if (backgroundCount > 200) {
    const r = rSum / backgroundCount;
    const g = gSum / backgroundCount;
    const b = bSum / backgroundCount;
    const grey = (r + g + b) / 3;
    /* Only correct a mild cast; a genuinely coloured surface is left alone. */
    const cast = Math.max(Math.abs(r - grey), Math.abs(g - grey), Math.abs(b - grey));
    if (grey > 40 && cast < 46) {
      const strength = 0.55;
      whiteBalance = [
        1 + ((grey / Math.max(1, r) - 1) * strength),
        1 + ((grey / Math.max(1, g) - 1) * strength),
        1 + ((grey / Math.max(1, b) - 1) * strength),
      ];
    }
  }

  if (count < 200) return { gain: 1, offset: 0, whiteBalance };

  const percentile = (p: number) => {
    const target = count * p;
    let running = 0;
    for (let value = 0; value < 256; value += 1) {
      running += histogram[value];
      if (running >= target) return value;
    }
    return 255;
  };

  /* Only ever lift a dim photo, and only by multiplying - a black offset would
     crush a charcoal hoodie to black, which is changing the garment rather
     than cleaning the photo up. A picture that is already well exposed is left
     completely alone. */
  const bright = percentile(0.97);
  if (bright >= 185) return { gain: 1, offset: 0, whiteBalance };

  const gain = clamp(200 / Math.max(1, bright), 1, 1.35);
  return { gain, offset: 0, whiteBalance };
}

/* ------------------------------------------------------------------ */
/* Step 4 - crop, centre and compose                                   */
/* ------------------------------------------------------------------ */

interface ComposeArgs {
  bitmap: ImageBitmap;
  mask: GarmentMask;
  pixels: ImageData;
  workWidth: number;
  workHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  angle: number;
  tone: ToneAdjustment;
  size: number;
}

function compose(args: ComposeArgs): HTMLCanvasElement | OffscreenCanvas | null {
  const { bitmap, mask, workWidth, workHeight, sourceWidth, sourceHeight, angle, tone, size } =
    args;

  /* Cut the garment out at full resolution: draw the photo, then multiply by
     the mask so the original pixels are preserved exactly. */
  const cut = createCanvas(sourceWidth, sourceHeight);
  const cutCtx = cut.getContext("2d", { willReadFrequently: true });
  if (!cutCtx) return null;
  cutCtx.drawImage(bitmap, 0, 0);

  const maskCanvas = createCanvas(workWidth, workHeight);
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) return null;
  const maskImage = maskCtx.createImageData(workWidth, workHeight);
  for (let i = 0; i < mask.alpha.length; i += 1) {
    maskImage.data[i * 4 + 3] = mask.alpha[i];
  }
  maskCtx.putImageData(maskImage, 0, 0);

  cutCtx.globalCompositeOperation = "destination-in";
  cutCtx.imageSmoothingQuality = "high";
  cutCtx.drawImage(maskCanvas as CanvasImageSource, 0, 0, sourceWidth, sourceHeight);
  cutCtx.globalCompositeOperation = "source-over";

  applyTone(cutCtx, sourceWidth, sourceHeight, tone);

  /* Bounds measured on the working mask, scaled back up to full resolution. */
  const scaleX = sourceWidth / workWidth;
  const scaleY = sourceHeight / workHeight;
  const left = mask.bounds.left * scaleX;
  const top = mask.bounds.top * scaleY;
  const cropWidth = Math.max(1, (mask.bounds.right - mask.bounds.left + 1) * scaleX);
  const cropHeight = Math.max(1, (mask.bounds.bottom - mask.bounds.top + 1) * scaleY);

  const output = createCanvas(size, size);
  const ctx = output.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  /* Rotating grows the footprint, so fit the rotated bounding box. */
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const rotatedWidth = cropWidth * cos + cropHeight * sin;
  const rotatedHeight = cropWidth * sin + cropHeight * cos;
  const fit = (size * FILL_RATIO) / Math.max(rotatedWidth, rotatedHeight);

  ctx.translate(size / 2, size / 2);
  if (angle) ctx.rotate(angle);
  ctx.scale(fit, fit);
  ctx.drawImage(
    cut as CanvasImageSource,
    left,
    top,
    cropWidth,
    cropHeight,
    -cropWidth / 2,
    -cropHeight / 2,
    cropWidth,
    cropHeight,
  );
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  return output;
}

function applyTone(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  tone: ToneAdjustment,
) {
  const { gain, offset, whiteBalance } = tone;
  if (gain === 1 && offset === 0 && whiteBalance.every((v) => v === 1)) return;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    data[i] = clamp(data[i] * whiteBalance[0] * gain + offset, 0, 255);
    data[i + 1] = clamp(data[i + 1] * whiteBalance[1] * gain + offset, 0, 255);
    data[i + 2] = clamp(data[i + 2] * whiteBalance[2] * gain + offset, 0, 255);
  }
  ctx.putImageData(image, 0, 0);
}

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return new OffscreenCanvas(width, height);
}

async function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type: "image/png" });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the image."));
    }, "image/png");
  });
}

export async function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(blob);
  }
}

async function blobDimensions(blob: Blob) {
  const bitmap = await loadBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close?.();
  return size;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Small, fast thumbnail used by the analyser and the before/after toggle. */
export async function downscale(blob: Blob, maxEdge: number): Promise<Blob> {
  const bitmap = await loadBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) {
    bitmap.close?.();
    return blob;
  }
  const canvas = createCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return blob;
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvasToBlob(canvas);
}
