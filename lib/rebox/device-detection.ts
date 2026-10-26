
import { supabaseAdmin } from "@/lib/supabase-admin";

const IDENTIFIER_TYPES = ["model_number", "model"] as const;

export type DeviceDetectionInput = {
  type: (typeof IDENTIFIER_TYPES)[number];
  value: string;
};

export async function detectDevice(input: DeviceDetectionInput) {
  const value = input.value.trim();

  if (!value) {
    throw new Error("Device identifier is required");
  }

  if (!IDENTIFIER_TYPES.includes(input.type)) {
    throw new Error(
      "Unsupported identifier type. Use model_number or model."
    );
  }

  let query = supabaseAdmin
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
    .eq("identifier_value", value);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Device catalog lookup failed:", error.message);
    throw new Error("Device detection lookup failed");
  }

  if (!data) {
    return {
      detected: false,
      device: null,
      variant: null,
      confidence: 0,
    };
  }

  const device = Array.isArray(data.device)
    ? data.device[0]
    : data.device;

  if (!device) {
    return {
      detected: false,
      device: null,
      variant: null,
      confidence: 0,
    };
  }

  let variantQuery = supabaseAdmin
    .from("device_variants")
    .select(`
      id,
      model_number,
      region,
      storage,
      connectivity,
      specifications
    `)
    .eq("device_id", device.id);

  if (input.type === "model_number") {
    variantQuery = variantQuery.eq("model_number", value);
  } else if (device.model_number) {
    variantQuery = variantQuery.eq(
      "model_number",
      device.model_number
    );
  }

  const { data: variant, error: variantError } =
    await variantQuery.maybeSingle();

  if (variantError) {
    console.error("Device variant lookup failed:", variantError.message);
    throw new Error("Device variant lookup failed");
  }

  return {
    detected: true,
    device,
    variant: variant ?? null,
    confidence: data.confidence ?? 0,
  };
}
