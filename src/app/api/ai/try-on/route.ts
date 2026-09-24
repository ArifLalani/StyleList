import { NextResponse } from "next/server";

/**
 * Try It On - the server half of the future integration.
 *
 * Point STYLE_LIST_TRY_ON_API_URL at a service that accepts the person's photo
 * plus the garment images and returns a rendered image, and the feature turns
 * itself on. Until then this answers 501 and the app says so plainly rather
 * than showing anything that could be mistaken for a real rendering.
 */

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const endpoint = process.env.STYLE_LIST_TRY_ON_API_URL;
  if (!endpoint) {
    return NextResponse.json(
      { error: "Try It On is not connected to an image service yet." },
      { status: 501 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const headers: HeadersInit = {};
  const key = process.env.STYLE_LIST_TRY_ON_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;

  try {
    const upstream = await fetch(endpoint, { method: "POST", body: form, headers });
    if (!upstream.ok) {
      return NextResponse.json({ error: "The image service failed." }, { status: 502 });
    }
    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/png",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the image service." }, { status: 502 });
  }
}
