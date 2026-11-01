
import { NextRequest, NextResponse } from "next/server";
import { detectDevice } from "@/lib/rebox/device-detection";
import { lookupImei } from "@/lib/rebox/providers/imei-info";
import { reconcileDevice } from "@/lib/rebox/catalog-reconciliation";
import { registerPhysicalDeviceWithEvidence } from "@/lib/rebox/register-physical-device-with-evidence";
import { imeiLookupRateLimit } from "@/lib/rebox/rate-limit";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["imei", "model_number", "model"] as const;
type IdentifierType = (typeof ALLOWED_TYPES)[number];

function hasValidImeiCheckDigit(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;

  let sum = 0;
  for (let i = 0; i < imei.length; i++) {
    let digit = Number(imei[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  return sum % 10 === 0;
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("type" in body) ||
      !("value" in body) ||
      typeof body.type !== "string" ||
      typeof body.value !== "string"
    ) {
      return NextResponse.json(
        { error: "Provide an identifier type and value." },
        { status: 400 }
      );
    }

    const { type, value } = body as {
      type: string;
      value: string;
    };

    if (!ALLOWED_TYPES.includes(type as IdentifierType)) {
      return NextResponse.json(
        { error: "Unsupported identifier type." },
        { status: 400 }
      );
    }

    const normalized = value.trim();

    if (!normalized || normalized.length > 120) {
      return NextResponse.json(
        { error: "Provide a valid device identifier." },
        { status: 400 }
      );
    }

    // Catalogue lookups do not incur external IMEI provider charges.
    if (type === "model_number" || type === "model") {
      const result = await detectDevice({
        type,
        value: normalized,
      });

      return NextResponse.json({
        success: true,
        source: "rebox_catalog",
        identification: result.device,
        variant: result.variant,
        confidence: result.confidence,
        catalogMatch: result.detected ? "matched" : "unmatched",
        verification: null,
      });
    }

    // Validate IMEI format before applying rate limits or calling the provider.
    const imei = normalized.replace(/\s+/g, "");

    if (!/^\d{15}$/.test(imei)) {
      return NextResponse.json(
        { error: "IMEI must contain exactly 15 digits." },
        { status: 400 }
      );
    }

    if (!hasValidImeiCheckDigit(imei)) {
      return NextResponse.json(
        { error: "IMEI check digit is invalid." },
        { status: 400 }
      );
    }

    // Use the client IP supplied by the trusted hosting platform.
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim();

    if (!clientIp) {
      return NextResponse.json(
        { error: "Unable to process this request." },
        { status: 503 }
      );
    }

    // Shared Upstash limit: 5 IMEI lookups per minute per client IP.
    const { success, reset } = await imeiLookupRateLimit.limit(clientIp);

    if (!success) {
      return NextResponse.json(
        { error: "Too many IMEI lookup requests. Try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((reset - Date.now()) / 1000))
            ),
          },
        }
      );
    }

    // Identify the device using the external provider.
    const result = await lookupImei(imei);

    // Match the provider's identification against the Rebox catalogue.
    const catalogMatch = await reconcileDevice(
      result.device.brand,
      result.device.model
    );

    // Register the physical device using its HMAC-hashed identifier.
const physicalDeviceId = await registerPhysicalDeviceWithEvidence({
  identifierType: "imei",
  identifierValue: imei,
  deviceId: catalogMatch.device?.id ?? null,
  variantId: null,
  provider: result.provider,
  brand: result.device.brand,
  model: result.device.model,
  tac: result.device.tac,
  specifications: result.device.specifications,
  blacklistStatus: result.verification.blacklistStatus,
  carrierLock: result.verification.carrierLock,
});

    return NextResponse.json({
      success: true,
      source: result.provider,
      physicalDeviceId,
      identification: {
        ...result.device,
        catalogMatch: catalogMatch.status,
        catalogDevice: catalogMatch.device,
      },
      verification: result.verification,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    console.error("Device identification failed.");

    // Fail closed if the rate-limit service or another dependency fails.
    return NextResponse.json(
      { error: "Device identification is temporarily unavailable." },
      { status: 502 }
    );
  }
}
