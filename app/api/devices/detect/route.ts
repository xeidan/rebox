
import { NextRequest, NextResponse } from "next/server";
import {
  detectDevice,
  type DeviceDetectionInput,
} from "@/lib/rebox/device-detection";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["model_number", "model"] as const;

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("type" in body) ||
      !("value" in body)
    ) {
      return NextResponse.json(
        { error: "Device type and value are required" },
        { status: 400 }
      );
    }

    const { type, value } = body as {
      type: unknown;
      value: unknown;
    };

    if (
      typeof type !== "string" ||
      !ALLOWED_TYPES.includes(
        type as (typeof ALLOWED_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Unsupported identifier type" },
        { status: 400 }
      );
    }

    if (
      typeof value !== "string" ||
      value.trim().length === 0 ||
      value.trim().length > 120
    ) {
      return NextResponse.json(
        { error: "Provide a valid device identifier" },
        { status: 400 }
      );
    }

    const result = await detectDevice({
      type: type as DeviceDetectionInput["type"],
      value: value.trim(),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    console.error("Device detection error:", error);

    return NextResponse.json(
      { error: "Unable to detect device" },
      { status: 500 }
    );
  }
}
