import { NextResponse } from "next/server";

/**
 * What this deployment can actually do.
 *
 * The app asks this once and adjusts its wording accordingly, so a person is
 * never told a cloud service cleaned up their photo when nothing of the sort
 * happened. Everything is driven by environment variables, so connecting a
 * real service is a deployment change, not a code change.
 */

export const runtime = "nodejs";

export function GET() {
  const imageApi = process.env.STYLE_LIST_IMAGE_API_URL;
  const tryOnApi = process.env.STYLE_LIST_TRY_ON_API_URL;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  return NextResponse.json({
    imageProcessing: Boolean(imageApi),
    itemAnalysis: Boolean(anthropicKey),
    tryOn: Boolean(tryOnApi),
    imageProviderName: imageApi ? (process.env.STYLE_LIST_IMAGE_API_NAME ?? "Image service") : undefined,
    analysisProviderName: anthropicKey ? "Claude" : undefined,
  });
}
