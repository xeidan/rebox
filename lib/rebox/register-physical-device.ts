
import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashDeviceIdentifier } from "@/lib/rebox/identifier-hash";

type RegisterPhysicalDeviceInput = {
  identifierType: "imei" | "serial" | "meid";
  identifierValue: string;
  deviceId: number | null;
  variantId: number | null;
};

export async function registerPhysicalDevice(
  input: RegisterPhysicalDeviceInput
): Promise<number> {
  const normalized = input.identifierValue
    .replace(/\s+/g, "")
    .toUpperCase();

  if (
    input.identifierType === "imei" &&
    !/^\d{15}$/.test(normalized)
  ) {
    throw new Error("IMEI must contain exactly 15 digits");
  }

  if (
    input.identifierType === "meid" &&
    !/^[0-9A-F]{14}$/.test(normalized)
  ) {
    throw new Error("MEID must contain exactly 14 hexadecimal characters");
  }

  if (
    input.identifierType === "serial" &&
    (normalized.length === 0 || normalized.length > 128)
  ) {
    throw new Error("Invalid serial number");
  }

  const identifierHash = hashDeviceIdentifier(normalized);
  const lastFour = /^\d{4}$/.test(normalized.slice(-4))
    ? normalized.slice(-4)
    : null;

  const { data, error } = await supabaseAdmin.rpc(
    "register_physical_device",
    {
      p_device_id: input.deviceId,
      p_variant_id: input.variantId,
      p_identifier_type: input.identifierType,
      p_identifier_hash: identifierHash,
      p_last_four: lastFour,
    }
  );

  if (error) {
    console.error(
      "Physical-device registration failed:",
      error.message
    );
    throw new Error("Could not register physical device");
  }

  const physicalDeviceId = Number(data);

  if (
    !Number.isSafeInteger(physicalDeviceId) ||
    physicalDeviceId <= 0
  ) {
    throw new Error("Invalid physical-device registration response");
  }

  return physicalDeviceId;
}
