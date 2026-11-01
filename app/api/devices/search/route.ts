import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = String(body.query ?? "").trim();

    if (!query || query.length > 120) {
      return NextResponse.json(
        { error: "Enter a valid device search." },
        { status: 400 },
      );
    }

    const safeQuery = escapeLike(query);
    const tokens = query.split(/\s+/).filter(Boolean);

    const deviceFields = `
      id,
      brand,
      model,
      model_number,
      category,
      release_year,
      specifications
    `;

    const searches = [
      supabaseAdmin
        .from("devices")
        .select(deviceFields)
        .ilike("brand", `%${safeQuery}%`)
        .limit(12),

      supabaseAdmin
        .from("devices")
        .select(deviceFields)
        .ilike("model", `%${safeQuery}%`)
        .limit(12),
    ];

    // Also support searches such as "Apple iPhone 15 Pro".
    if (tokens.length > 1) {
      const brand = escapeLike(tokens[0]);
      const model = escapeLike(tokens.slice(1).join(" "));

      searches.push(
        supabaseAdmin
          .from("devices")
          .select(deviceFields)
          .ilike("brand", `%${brand}%`)
          .ilike("model", `%${model}%`)
          .limit(12),
      );
    }

    const results = await Promise.all(searches);
    const failedSearch = results.find((result) => result.error);

    if (failedSearch?.error) {
      throw new Error("Device catalogue search failed.");
    }

    const deviceMap = new Map<number, (typeof results)[number]["data"] extends (infer T)[] | null ? T : never>();

    for (const result of results) {
      for (const device of result.data ?? []) {
        if (device) deviceMap.set(device.id, device);
      }
    }

    const devices = Array.from(deviceMap.values()).slice(0, 20);

    if (devices.length === 0) {
      return NextResponse.json({
        status: "unmatched",
        candidates: [],
      });
    }

    const deviceIds = devices.map((device) => device.id);

    const { data: variants, error: variantError } = await supabaseAdmin
      .from("device_variants")
      .select(`
        id,
        device_id,
        model_number,
        region,
        storage,
        connectivity,
        specifications
      `)
      .in("device_id", deviceIds)
      .limit(200);

    if (variantError) {
      throw new Error("Device variant lookup failed.");
    }

    const candidates = devices.map((device) => ({
      device,
      variants: (variants ?? []).filter(
        (variant) => variant.device_id === device.id,
      ),
    }));

    return NextResponse.json({
      status: "candidates",
      candidates,
    });
  } catch (error) {
    console.error("Device search error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to search the device catalogue.",
      },
      { status: 500 },
    );
  }
}
