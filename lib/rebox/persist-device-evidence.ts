
import "server-only";

import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PersistDeviceEvidenceInput = {
  physicalDeviceId: number;
  provider: string;
  brand: string;
  model: string;
  tac: string | null;
  specifications: unknown;
  blacklistStatus: string | null;
  carrierLock: boolean | null;
};

export async function persistDeviceEvidence(
  input: PersistDeviceEvidenceInput
): Promise<void> {
  const rawBlacklistStatus = input.blacklistStatus?.toUpperCase();

  const blacklistStatus =
    rawBlacklistStatus === "CLEAN" ||
    rawBlacklistStatus === "BLACKLISTED"
      ? rawBlacklistStatus
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

  const { error } = await supabaseAdmin.rpc(
    "persist_device_evidence_atomic",
    {
      p_physical_device_id: input.physicalDeviceId,
      p_provider: input.provider,
      p_brand: input.brand,
      p_model: input.model,
      p_tac: input.tac,
      p_specifications:
        input.specifications == null ? null : input.specifications,
      p_blacklist_status: blacklistStatus,
      p_carrier_lock: input.carrierLock,
      p_payload_hash: payloadHash,
    }
  );

  if (error) {
    console.error("Atomic device evidence persistence failed.");
    throw new Error("Could not persist device evidence");
  }
}
