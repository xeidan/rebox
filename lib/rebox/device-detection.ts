import { supabaseAdmin } from "@/lib/supabase-admin";

const IDENTIFIER_TYPES = ["model_number", "model"] as const;

export type DeviceDetectionInput = {
  type: (typeof IDENTIFIER_TYPES)[number];
  value: string;
};

type MatchLevel = "exact" | "strong" | "partial" | "unknown";

function getConfidenceLevel(confidence: number): MatchLevel {
  if (confidence >= 0.99) return "exact";
  if (confidence >= 0.85) return "strong";
  if (confidence > 0) return "partial";
  return "unknown";
}

function unmatched(reason: string) {
  return {
    detected: false,
    status: "unmatched",
    reason,
    device: null,
    variant: null,
    confidence: 0,
    confidenceLevel: "unknown" as MatchLevel,
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function getVariants(deviceId: number) {
  const { data, error } = await supabaseAdmin
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
    .eq("device_id", deviceId)
    .limit(20);

  if (error) throw new Error("Device variant lookup failed");

  return data ?? [];
}

async function getDeviceResult(
  device: Record<string, unknown>,
  confidence: number,
  matchMethod: string,
  selectedVariant?: Record<string, unknown> | null,
) {
  const variants = await getVariants(Number(device.id));

  let variant = selectedVariant ?? null;

  if (!variant && device.model_number) {
    const matches = variants.filter(
      (item) =>
        item.model_number?.toLowerCase() ===
        String(device.model_number).toLowerCase(),
    );

    if (matches.length === 1) variant = matches[0];
  }

  return {
    detected: true,
    status: "matched",
    device,
    variant,
    variants,
    confidence,
    confidenceLevel: getConfidenceLevel(confidence),
    matchMethod,
  };
}

export async function detectDevice(input: DeviceDetectionInput) {
  const value = input.value.trim();

  if (!value || value.length > 120) {
    throw new Error("Invalid device identifier");
  }

  if (!IDENTIFIER_TYPES.includes(input.type)) {
    throw new Error("Unsupported identifier type");
  }

  if (input.type === "model_number") {
    const { data, error } = await supabaseAdmin
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
      .ilike("model_number", value)
      .limit(2);

    if (error) throw new Error("Device variant lookup failed");

    if (data && data.length > 1) {
      const deviceIds = [...new Set(data.map((variant) => variant.device_id))];

      const { data: devices, error: devicesError } = await supabaseAdmin
        .from("devices")
        .select(`
          id,
          brand,
          model,
          model_number,
          category,
          release_year,
          specifications
        `)
        .in("id", deviceIds);

      if (devicesError) throw new Error("Device catalogue lookup failed");

      const candidates = (devices ?? []).map((device) => ({
        device,
        variants: data.filter((variant) => variant.device_id === device.id),
      }));

      return {
        ...unmatched("Multiple regional variants match this model number."),
        status: "ambiguous",
        candidates,
      };
    }

    if (data?.length === 1) {
      const variant = data[0];

      const { data: device, error: deviceError } = await supabaseAdmin
        .from("devices")
        .select(`
          id,
          brand,
          model,
          model_number,
          category,
          release_year,
          specifications
        `)
        .eq("id", variant.device_id)
        .maybeSingle();

      if (deviceError) throw new Error("Device catalogue lookup failed");

      if (!device) return unmatched("Catalogue device not found.");

      return getDeviceResult(
        device,
        1,
        "exact_model_number",
        variant,
      );
    }
  }

  // First check explicitly registered identifiers.
  const { data: identifiers, error: identifierError } =
    await supabaseAdmin
      .from("device_identifiers")
      .select(`
        id,
        identifier_type,
        identifier_value,
        confidence,
        device:devices (
          id,
          brand,
          model,
          model_number,
          category,
          release_year,
          specifications
        )
      `)
      .eq("identifier_type", input.type)
      .ilike("identifier_value", value)
      .limit(2);

  if (identifierError) {
    throw new Error("Device identifier lookup failed");
  }

  if (identifiers && identifiers.length > 1) {
    return {
      ...unmatched("Multiple catalogue identifiers match."),
      status: "ambiguous",
    };
  }

  if (identifiers?.length === 1) {
    const record = identifiers[0];
    const device = Array.isArray(record.device)
      ? record.device[0]
      : record.device;

    if (device) {
      const confidence = Math.max(
        0,
        Math.min(1, Number(record.confidence ?? 0)),
      );

      return getDeviceResult(
        device,
        confidence,
        "registered_identifier",
      );
    }
  }

  if (input.type === "model") {
    const safeValue = escapeLike(value);

    // Exact model match.
    const { data: exact, error: exactError } = await supabaseAdmin
      .from("devices")
      .select(`
        id,
        brand,
        model,
        model_number,
        category,
        release_year,
        specifications
      `)
      .ilike("model", value)
      .limit(2);

    if (exactError) throw new Error("Device catalogue lookup failed");

    if (exact && exact.length > 1) {
      return {
        ...unmatched("Multiple devices match this model."),
        status: "ambiguous",
        candidates: exact,
      };
    }

    if (exact?.length === 1) {
      return getDeviceResult(exact[0], 0.95, "exact_catalogue_model");
    }

    // Partial model match.
    const { data: partial, error: partialError } = await supabaseAdmin
      .from("devices")
      .select(`
        id,
        brand,
        model,
        model_number,
        category,
        release_year,
        specifications
      `)
      .ilike("model", `%${safeValue}%`)
      .limit(2);

    if (partialError) throw new Error("Device catalogue lookup failed");

    if (partial && partial.length > 1) {
      return {
        ...unmatched("Multiple devices partially match this search."),
        status: "ambiguous",
        candidates: partial,
      };
    }

    if (partial?.length === 1) {
      return getDeviceResult(partial[0], 0.75, "partial_catalogue_model");
    }
  }

  return unmatched("No matching device was found in the Rebox catalogue.");
}
