import { supabaseAdmin } from "@/lib/supabase-admin";

const IDENTIFIER_TYPES = ["model_number", "model"] as const;

export type DeviceDetectionInput = {
  type: (typeof IDENTIFIER_TYPES)[number];
  value: string;
};

type MatchLevel = "exact" | "strong" | "partial" | "unknown";

type DeviceRecord = Record<string, any>;
type VariantRecord = Record<string, any>;

function getConfidenceLevel(confidence: number): MatchLevel {
  if (confidence >= 0.99) return "exact";
  if (confidence >= 0.85) return "strong";
  if (confidence > 0) return "partial";
  return "unknown";
}

function validateConfidence(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const confidence = Number(value);

  if (
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    return null;
  }

  return confidence;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function normalizeDeviceName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function unmatched(reason: string) {
  return {
    detected: false,
    status: "unmatched",
    reason,
    device: null,
    variant: null,
    variants: [],
    confidence: 0,
    confidenceLevel: "unknown" as MatchLevel,
    matchMethod: null,
  };
}

async function getVariants(deviceId: number): Promise<VariantRecord[]> {
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
    .eq("device_id", deviceId);

  if (error) {
    throw new Error("Device variant lookup failed");
  }

  return data ?? [];
}

async function getDeviceResult(
  device: DeviceRecord,
  confidence: number,
  matchMethod: string,
  selectedVariant?: VariantRecord | null,
) {
  const variants = await getVariants(Number(device.id));

  // A model-name match does not establish the physical hardware variant.
  // Only an explicit variant lookup can select a variant.
  return {
    detected: true,
    status: "matched",
    device,
    variant: selectedVariant ?? null,
    variants,
    confidence,
    confidenceLevel: getConfidenceLevel(confidence),
    matchMethod,
  };
}

function unverifiedIdentifier(
  device: DeviceRecord,
  matchMethod: string,
) {
  return {
    detected: false,
    status: "unverified",
    reason: "The registered identifier has no valid confidence value.",
    device,
    variant: null,
    variants: [],
    confidence: 0,
    confidenceLevel: "unknown" as MatchLevel,
    matchMethod,
  };
}

export async function detectDevice(input: DeviceDetectionInput) {
  if (
    !input ||
    typeof input.value !== "string" ||
    !IDENTIFIER_TYPES.includes(input.type)
  ) {
    throw new Error("Invalid device identifier");
  }

  const value = input.value.trim();

  if (!value || value.length > 120) {
    throw new Error("Invalid device identifier");
  }

  const safeValue = escapeLike(value);

  // 1. Exact hardware model-number identification.
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
      .ilike("model_number", safeValue)
      .limit(2);

    if (error) {
      throw new Error("Device variant lookup failed");
    }

    if (data && data.length > 1) {
      const deviceIds = [...new Set(data.map((item) => item.device_id))];

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

      if (devicesError) {
        throw new Error("Device catalogue lookup failed");
      }

      const candidates = (devices ?? []).map((device) => ({
        device,
        variants: data.filter(
          (item) => item.device_id === device.id,
        ),
      }));

      // Multiple variants of one device are different from multiple
      // possible device identities.
      if (candidates.length === 1) {
        return {
          detected: true,
          status: "variant_ambiguous",
          reason: "Multiple variants match this model number.",
          device: candidates[0].device,
          variant: null,
          variants: candidates[0].variants,
          confidence: 0.95,
          confidenceLevel: "strong" as MatchLevel,
          matchMethod: "exact_model_number",
        };
      }

      return {
        ...unmatched("Multiple devices match this model number."),
        status: "ambiguous",
        candidates,
      };
    }

    if (data?.length === 1) {
      const selectedVariant = data[0];

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
        .eq("id", selectedVariant.device_id)
        .maybeSingle();

      if (deviceError) {
        throw new Error("Device catalogue lookup failed");
      }

      if (!device) {
        return unmatched("Catalogue device not found.");
      }

      return getDeviceResult(
        device,
        1,
        "exact_model_number",
        selectedVariant,
      );
    }
  }

  // 2. Check explicitly registered identifiers.
  const { data: identifiers, error: identifierError } =
    await supabaseAdmin
      .from("device_identifiers")
      .select(`
        id,
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
      .ilike("identifier_value", safeValue)
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

    const device = (
      Array.isArray(record.device)
        ? record.device[0]
        : record.device
    ) as DeviceRecord | null;

    if (device) {
      const confidence = validateConfidence(record.confidence);

      if (confidence === null || confidence === 0) {
        const variants = await getVariants(Number(device.id));

        return {
          ...unverifiedIdentifier(device, "registered_identifier"),
          variants,
        };
      }

      return getDeviceResult(
        device,
        confidence,
        "registered_identifier",
      );
    }
  }

   // 3. Exact catalogue model-name identification.
  if (input.type === "model") {
    const normalizedInput = normalizeDeviceName(value);

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
      `);

    if (devicesError) {
      throw new Error("Device catalogue lookup failed");
    }

    const matches = (devices ?? []).filter((device) => {
      const normalizedBrand = normalizeDeviceName(device.brand ?? "");
      const normalizedModel = normalizeDeviceName(device.model ?? "");

      const fullName = `${normalizedBrand} ${normalizedModel}`.trim();

      return (
        normalizedModel === normalizedInput ||
        fullName === normalizedInput
      );
    });

    if (matches.length > 1) {
      return {
        ...unmatched("Multiple devices match this model."),
        status: "ambiguous",
        candidates: matches,
      };
    }

    if (matches.length === 1) {
      return getDeviceResult(
        matches[0],
        0.99,
        "exact_catalogue_model",
      );
    }

    // 4. Partial model-name search.
    const partialMatches = (devices ?? []).filter((device) => {
      const normalizedBrand = normalizeDeviceName(device.brand ?? "");
      const normalizedModel = normalizeDeviceName(device.model ?? "");
      const fullName = `${normalizedBrand} ${normalizedModel}`.trim();

      return (
        normalizedModel.includes(normalizedInput) ||
        fullName.includes(normalizedInput)
      );
    });

    if (partialMatches.length > 0) {
      const candidates = await Promise.all(
        partialMatches.slice(0, 10).map(async (device) => ({
          device,
          variants: await getVariants(Number(device.id)),
        })),
      );

      return {
        detected: false,
        status: "partial",
        reason: "Partial model-name matches require confirmation.",
        device: null,
        variant: null,
        variants: [],
        candidates,
        confidence: 0,
        confidenceLevel: "unknown" as MatchLevel,
        matchMethod: "partial_catalogue_model",
      };
    }
  }

  return unmatched("No matching device was found in the Rebox catalogue.");
}