
import "server-only";

import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashDeviceIdentifier } from "@/lib/rebox/identifier-hash";

type RegisterPhysicalDeviceWithEvidenceInput = {
  identifierType: "imei" | "serial" | "meid";
  identifierValue: string;
  deviceId: number | null;
  variantId: number | null;
  provider: string;
  brand: string;
  model: string;
  tac: string | null;
  specifications: unknown;
  blacklistStatus: string | null;
  carrierLock: boolean | null;
};

export async function registerPhysicalDeviceWithEvidence(
  input: RegisterPhysicalDeviceWithEvidenceInput
): Promise<number> {
  const normalized = input.identifierValue
    .replace(/\s+/g, "")
    .toUpperCase();

  if (input.identifierType === "imei" && !/^\d{15}$/.test(normalized)) {
    throw new Error("Invalid IMEI");
  }

  if (input.identifierType === "meid" && !/^[0-9A-F]{14}$/.test(normalized)) {
    throw new Error("Invalid MEID");
  }

  if (
    input.identifierType === "serial" &&
    (!normalized || normalized.length > 128)
  ) {
    throw new Error("Invalid serial number");
  }

  const blacklistStatus =
    input.blacklistStatus?.toUpperCase() === "CLEAN" ||
    input.blacklistStatus?.toUpperCase() === "BLACKLISTED"
      ? input.blacklistStatus.toUpperCase()
      : null;

  const identifierHash = hashDeviceIdentifier(normalized);
  const lastFour = /^\d{4}$/.test(normalized.slice(-4))
    ? normalized.slice(-4)
    : null;

  const payloadHash = createHash("sha256")
    .update(
      JSON.stringify({
        provider: input.provider,
        brand: input.brand,
        model: input.model,
        tac: input.tac,
        specifications: input.specifications,
        blacklistStatus,
        carrierLock: input.carrierLock,
      })
    )
    .digest("hex");

  const { data, error } = await supabaseAdmin.rpc(
    "register_physical_device_with_evidence",
    {
      p_device_id: input.deviceId,
      p_variant_id: input.variantId,
      p_identifier_type: input.identifierType,
      p_identifier_hash: identifierHash,
      p_last_four: lastFour,
      p_provider: input.provider,
      p_brand: input.brand,
      p_model: input.model,
      p_tac: input.tac,
      p_specifications: input.specifications ?? null,
      p_blacklist_status: blacklistStatus,
      p_carrier_lock: input.carrierLock,
      p_payload_hash: payloadHash,
    }
  );

  if (error) {
    console.error("Physical-device registration and evidence persistence failed.");
    throw new Error("Could not complete device registration");
  }

  const physicalDeviceId = Number(data);

  if (!Number.isSafeInteger(physicalDeviceId) || physicalDeviceId <= 0) {
    throw new Error("Invalid physical-device registration response");
  }

  return physicalDeviceId;
}
