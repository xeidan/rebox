
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();

  if (!name || name.length > 100) {
    return NextResponse.json(
      { error: "A valid device name is required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.MOBILEAPI_KEY;

  if (!apiKey) {
    console.error("MobileAPI key is not configured.");
    return NextResponse.json(
      { error: "Device image service is not configured." },
      { status: 503 },
    );
  }

  try {
    const url = new URL("https://api.mobileapi.dev/devices/search/");
    url.searchParams.set("name", name);

    const response = await fetch(url, {
        headers: {
            Authorization: `Token ${apiKey}`,
            Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
        next: { revalidate: 86400 },
        });

    if (response.status === 204 || response.status === 404) {
      return NextResponse.json(
        { device: null },
        { headers: { "Cache-Control": "public, max-age=300" } },
      );
    }

    if (!response.ok) {
      console.error("MobileAPI device search failed:", response.status);

      return NextResponse.json(
        { error: "Could not retrieve device information." },
        { status: response.status === 429 ? 429 : 502 },
      );
    }

    const data: unknown = await response.json();

    const devices =
      typeof data === "object" &&
      data !== null &&
      "devices" in data &&
      Array.isArray(data.devices)
        ? data.devices
        : [];

    const candidate: unknown = devices[0];

    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("id" in candidate) ||
      !("name" in candidate) ||
      (typeof candidate.id !== "string" &&
        typeof candidate.id !== "number") ||
      !String(candidate.id).trim() ||
      typeof candidate.name !== "string" ||
      !candidate.name.trim()
    ) {
      return NextResponse.json(
        { device: null },
        { headers: { "Cache-Control": "public, max-age=300" } },
      );
    }

    const rawImage =
      "main_image_url" in candidate &&
      typeof candidate.main_image_url === "string"
        ? candidate.main_image_url
        : "image_url" in candidate &&
            typeof candidate.image_url === "string"
          ? candidate.image_url
          : null;

    let image: string | null = null;

    if (rawImage) {
      try {
        const parsedImageUrl = new URL(rawImage);
        if (
          parsedImageUrl.protocol === "https:" ||
          parsedImageUrl.protocol === "http:"
        ) {
          image = parsedImageUrl.toString();
        }
      } catch {
        image = null;
      }
    }

    return NextResponse.json(
      {
        device: {
          id: candidate.id,
          name: candidate.name.trim(),
          image,
        },
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=86400, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    console.error("MobileAPI request failed.");

    return NextResponse.json(
      { error: "Device lookup failed." },
      { status: 502 },
    );
  }
}
