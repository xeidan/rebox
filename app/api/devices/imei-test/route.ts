
import { NextResponse } from "next/server";
import { lookupImei } from "@/lib/rebox/providers/imei-info";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await lookupImei("350545260771498");
    return NextResponse.json(result);
  } catch (error) {
    console.error("IMEI provider test failed:", error);

    return NextResponse.json(
      { error: "IMEI provider test failed" },
      { status: 502 }
    );
  }
}
