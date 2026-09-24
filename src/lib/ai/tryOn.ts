"use client";

import type { ClothingItem } from "@/lib/types";
import { aiCapabilities } from "./imageProcessing";

/**
 * Try It On - the integration hook, not a pretend feature.
 *
 * Showing an outfit on the person themselves needs a real image-generation
 * service. Until one is connected this module says so plainly and the UI shows
 * the flat-lay preview instead. It deliberately does not mock up a fake
 * rendering: a person would believe it.
 *
 * To connect one later, implement POST /api/ai/try-on so that it accepts the
 * person's photo plus the garment images and returns an image. Everything else
 * here already works.
 */

export interface TryOnRequest {
  personPhoto: Blob;
  items: ClothingItem[];
  itemImages: Blob[];
}

export type TryOnResult =
  | { status: "ready"; image: Blob }
  | { status: "unavailable"; reason: string }
  | { status: "failed"; reason: string };

export async function isTryOnAvailable(): Promise<boolean> {
  const capabilities = await aiCapabilities();
  return capabilities.tryOn;
}

export async function renderTryOn(request: TryOnRequest): Promise<TryOnResult> {
  const capabilities = await aiCapabilities();
  if (!capabilities.tryOn) {
    return {
      status: "unavailable",
      reason: "Try It On needs an image service to be connected to this app.",
    };
  }

  try {
    const body = new FormData();
    body.append("person", request.personPhoto);
    request.itemImages.forEach((image, index) => body.append(`item-${index}`, image));
    body.append(
      "items",
      JSON.stringify(
        request.items.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          color: item.primaryColor,
        })),
      ),
    );

    const response = await fetch("/api/ai/try-on", { method: "POST", body });
    if (!response.ok) {
      return { status: "failed", reason: "The image service could not complete this one." };
    }
    return { status: "ready", image: await response.blob() };
  } catch {
    return { status: "failed", reason: "Could not reach the image service." };
  }
}
