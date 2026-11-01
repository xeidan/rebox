import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rebox/require-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  let body: { id?: number; action?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = Number(body.id);
  const action = body.action;

  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Valid request ID required" }, { status: 400 });
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Action must be approve or reject" }, { status: 400 });
  }

  const { data: catalogueRequest, error: fetchError } = await supabaseAdmin
    .from("device_catalogue_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !catalogueRequest) {
    return NextResponse.json({ error: "Catalogue request not found" }, { status: 404 });
  }

  if (catalogueRequest.status !== "pending") {
    return NextResponse.json({ error: "Request already reviewed" }, { status: 409 });
  }

  if (action === "reject") {
    const { data, error } = await supabaseAdmin
      .from("device_catalogue_requests")
      .update({ status: "rejected" })
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Unable to reject request" }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: "rejected" });
  }

  const brand = catalogueRequest.brand?.trim();
  const model = catalogueRequest.model?.trim();
  const modelNumber = catalogueRequest.model_number?.trim() || null;
  const category = catalogueRequest.category?.trim();

  if (!brand || !model || !category) {
    return NextResponse.json(
      { error: "Brand, model and category are required for approval" },
      { status: 400 }
    );
  }

  const { data: devices, error: deviceError } = await supabaseAdmin
    .from("devices")
    .select("id")
    .ilike("brand", brand)
    .ilike("model", model)
    .limit(2);

  if (deviceError) {
    return NextResponse.json({ error: "Unable to check catalogue" }, { status: 500 });
  }

  if (devices && devices.length > 1) {
    return NextResponse.json({ error: "Multiple matching devices found" }, { status: 409 });
  }

  let deviceId: number;

  if (devices?.length === 1) {
    deviceId = devices[0].id;
  } else {
    const { data: newDevice, error } = await supabaseAdmin
      .from("devices")
      .insert({
        brand,
        model,
        category,
        specifications: {},
      })
      .select("id")
      .single();

    if (error || !newDevice) {
      console.error("Device creation failed:", error);
      return NextResponse.json({ error: "Unable to create device" }, { status: 500 });
    }

    deviceId = newDevice.id;
  }

  if (modelNumber) {
    const { data: variants, error } = await supabaseAdmin
      .from("device_variants")
      .select("id, device_id")
      .ilike("model_number", modelNumber)
      .limit(2);

    if (error) {
      return NextResponse.json({ error: "Unable to check device variants" }, { status: 500 });
    }

    if (variants?.some((variant) => variant.device_id !== deviceId)) {
      return NextResponse.json(
        { error: "Model number belongs to another device" },
        { status: 409 }
      );
    }

    if (!variants?.length) {
      const { error: insertError } = await supabaseAdmin
        .from("device_variants")
        .insert({
          device_id: deviceId,
          model_number: modelNumber,
          region: null,
          specifications: {},
        });

      if (insertError) {
        console.error("Variant creation failed:", insertError);
        return NextResponse.json({ error: "Unable to create device variant" }, { status: 500 });
      }
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("device_catalogue_requests")
    .update({ status: "added" })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Device was added, but request status could not be updated. Check the catalogue before retrying." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    status: "added",
    device_id: deviceId,
  });
}
