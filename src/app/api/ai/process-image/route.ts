import { NextResponse } from "next/server";

/**
 * Hands a photo to whatever image service the deployment has been given, and
 * hands the cleaned-up image back. The app never talks to the vendor directly,
 * so swapping providers is a change to two environment variables:
 *
 *   STYLE_LIST_IMAGE_API_URL  - endpoint that accepts multipart "image"
 *   STYLE_LIST_IMAGE_API_KEY  - sent as a bearer token, if the service needs one
 *
 * With nothing configured this answers 501 and the app cleans the photo up on
 * the device instead.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const endpoint = process.env.STYLE_LIST_IMAGE_API_URL;
  if (!endpoint) {
    return NextResponse.json(
      { error: "No image service is connected to this deployment." },
      { status: 501 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded image." }, { status: 400 });
  }

  if (!(form.get("image") instanceof File)) {
    return NextResponse.json({ error: "No image was uploaded." }, { status: 400 });
  }

  const headers: HeadersInit = {};
  const key = process.env.STYLE_LIST_IMAGE_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;

  try {
    const upstream = await fetch(endpoint, { method: "POST", body: form, headers });
    if (!upstream.ok) {
      return NextResponse.json({ error: "The image service failed." }, { status: 502 });
    }
    const contentType = upstream.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "The image service returned no image." }, { status: 502 });
    }
    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        "content-type": contentType,
        "x-confidence": upstream.headers.get("x-confidence") ?? "0.9",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the image service." }, { status: 502 });
  }
}
