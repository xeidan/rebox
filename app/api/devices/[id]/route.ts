
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const deviceId = Number(id);

    if (!Number.isSafeInteger(deviceId) || deviceId <= 0) {
      return NextResponse.json(
        { error: "Invalid device ID." },
        { status: 400 },
      );
    }

    const { data: device, error: deviceError } = await supabaseAdmin
      .from("devices")
      .select(`
        id,
        brand,
        model,
        model_number,
        category,
        release_year,
        specifications,
        created_at
      `)
      .eq("id", deviceId)
      .maybeSingle();

    if (deviceError) {
      console.error("Device lookup failed:", deviceError.message);
      return NextResponse.json(
        { error: "Unable to retrieve device details." },
        { status: 500 },
      );
    }

    if (!device) {
      return NextResponse.json(
        { error: "Device not found." },
        { status: 404 },
      );
    }

    const [
      variantsResult,
      identifiersResult,
      verificationsResult,
      physicalDevicesResult,
      dataSourcesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("device_variants")
        .select(`
          id,
          device_id,
          model_number,
          region,
          storage,
          connectivity,
          specifications,
          created_at
        `)
        .eq("device_id", deviceId),

      supabaseAdmin
        .from("device_identifiers")
        .select(`
          id,
          identifier_type,
          source,
          confidence,
          created_at
        `)
        .eq("device_id", deviceId),

      supabaseAdmin
        .from("device_verifications")
        .select(`
          id,
          verification_type,
          result,
          confidence,
          metadata,
          created_at
        `)
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("physical_devices")
        .select(`
          id,
          device_id,
          variant_id,
          status,
          first_seen_at,
          last_seen_at,
          created_at,
          updated_at
        `)
        .eq("device_id", deviceId)
        .order("updated_at", { ascending: false }),

      supabaseAdmin
        .from("device_data_sources")
        .select(`
          id,
          device_id,
          variant_id,
          source_name,
          source_record_id,
          retrieved_at,
          metadata
        `)
        .eq("device_id", deviceId)
        .order("retrieved_at", { ascending: false }),
    ]);

    const queryErrors = [
      variantsResult.error,
      identifiersResult.error,
      verificationsResult.error,
      physicalDevicesResult.error,
      dataSourcesResult.error,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      console.error(
        "Device story related data lookup failed:",
        queryErrors.map((error) => error?.message),
      );

      return NextResponse.json(
        { error: "Unable to retrieve complete device details." },
        { status: 500 },
      );
    }

    const physicalDevices = physicalDevicesResult.data ?? [];
    const physicalDeviceIds = physicalDevices.map((item) => item.id);

    let evidence: Record<string, unknown>[] = [];

    if (physicalDeviceIds.length > 0) {
      const { data: evidenceData, error: evidenceError } =
        await supabaseAdmin
          .from("device_evidence")
          .select(`
            id,
            physical_device_id,
            evidence_type,
            result,
            source_type,
            source_name,
            confidence,
            observed_at,
            expires_at,
            metadata,
            created_at
          `)
          .in("physical_device_id", physicalDeviceIds)
          .order("observed_at", { ascending: false });

      if (evidenceError) {
        console.error("Device evidence lookup failed:", evidenceError.message);

        return NextResponse.json(
          { error: "Unable to retrieve device evidence." },
          { status: 500 },
        );
      }

      evidence = evidenceData ?? [];
    }

    return NextResponse.json({
      success: true,
      device,
      variants: variantsResult.data ?? [],
      identifiers: identifiersResult.data ?? [],
      verifications: verificationsResult.data ?? [],
      physicalDevices,
      evidence,
      dataSources: dataSourcesResult.data ?? [],
    });
  } catch (error) {
    console.error("Device story API failed:", error);

    return NextResponse.json(
      { error: "Device details are temporarily unavailable." },
      { status: 500 },
    );
  }
}
