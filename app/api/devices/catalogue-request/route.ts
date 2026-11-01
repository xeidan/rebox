import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function clean(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Quietly discard basic bot submissions.
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ success: true });
    }

    const brand = clean(body.brand, 80);
    const model = clean(body.model, 120);
    const modelNumber = clean(body.model_number, 80);
    const category = clean(body.category, 50);
    const details = clean(body.details, 1000);

    if (!brand && !model && !modelNumber) {
      return NextResponse.json(
        { error: "Provide a brand, model or model number." },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("device_catalogue_requests")
      .insert({
        brand,
        model,
        model_number: modelNumber,
        category,
        details,
        source: "device_page",
      });

    if (error) {
      console.error("Catalogue request submission failed:", error);
      return NextResponse.json(
        { error: "Unable to submit your device request." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Device request submitted successfully." },
      { status: 201 },
    );
  } catch (error) {
    console.error("Catalogue request error:", error);

    return NextResponse.json(
      { error: "Invalid request. Please try again." },
      { status: 400 },
    );
  }
}
