import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { COLORS } from "@/lib/colors";
import { CATEGORIES, PATTERNS, SEASONS } from "@/lib/types";

/**
 * Reads a photo of one garment and returns the fields the confirm screen needs.
 *
 * Only runs when ANTHROPIC_API_KEY is set on the deployment. Without it the
 * route answers 501 and the app falls back to its on-device read, which is
 * measured from the pixels rather than guessed.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const COLOR_NAMES = COLORS.map((color) => color.name) as [string, ...string[]];

const GarmentSchema = z.object({
  name: z
    .string()
    .describe("A short everyday name a person would use, e.g. 'Black Essentials Hoodie'."),
  category: z.enum(CATEGORIES),
  subcategory: z.string().describe("A more specific type, e.g. 'Sneakers'. Empty string if unsure."),
  primaryColor: z.enum(COLOR_NAMES),
  secondaryColor: z
    .enum(["None", ...COLOR_NAMES])
    .describe("A clearly present second colour, or 'None'."),
  pattern: z.enum(PATTERNS),
  brand: z
    .string()
    .describe("Only if a logo or label is legible in the photo. Empty string otherwise."),
  material: z.string().describe("Only if clearly identifiable, e.g. 'Denim'. Empty string otherwise."),
  season: z.enum(SEASONS),
  description: z.string().describe("One short sentence describing the item."),
  warmth: z.number().int().min(1).max(5).describe("1 very light, 5 very warm."),
  dressiness: z.number().int().min(1).max(5).describe("1 very casual, 5 formal."),
  confidence: z.number().min(0).max(1).describe("How sure you are about the category."),
});

const SYSTEM_PROMPT = `You identify a single item of clothing in a photo for a personal wardrobe app.

Rules:
- Describe only what is visible. Never invent a brand, a material or a detail you cannot see.
- If no logo or label is legible, return an empty string for brand. A guess is worse than a blank the person can fill in.
- Choose the colour name that a person would use for the garment overall, ignoring small logos and prints.
- Keep the name short and natural: colour, brand if known, then the item. No marketing language.
- The person will confirm everything, so prefer an honest low confidence over a confident mistake.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No analysis service is connected to this deployment." },
      { status: 501 },
    );
  }

  let image: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("image");
    if (value instanceof File) image = value;
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded image." }, { status: 400 });
  }

  if (!image) {
    return NextResponse.json({ error: "No image was uploaded." }, { status: 400 });
  }

  const mediaType = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(image.type)
    ? (image.type as "image/png" | "image/jpeg" | "image/webp" | "image/gif")
    : "image/png";
  const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "low",
        format: zodOutputFormat(GarmentSchema),
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Identify this item of clothing." },
          ],
        },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return NextResponse.json({ error: "The item could not be read." }, { status: 502 });
    }

    return NextResponse.json({
      name: parsed.name,
      category: parsed.category,
      subcategory: parsed.subcategory || undefined,
      primaryColor: parsed.primaryColor,
      secondaryColor: parsed.secondaryColor === "None" ? undefined : parsed.secondaryColor,
      pattern: parsed.pattern,
      brand: parsed.brand || undefined,
      material: parsed.material || undefined,
      season: parsed.season,
      description: parsed.description,
      warmth: parsed.warmth,
      dressiness: parsed.dressiness,
      confidence: { category: parsed.confidence, color: parsed.confidence },
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Busy right now. Try again shortly." }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "The analysis service rejected its key." }, { status: 502 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "The analysis service failed." }, { status: 502 });
    }
    return NextResponse.json({ error: "Unexpected failure." }, { status: 500 });
  }
}
