
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
  const observedAt = new Date().toISOString();

  // Accept only explicitly recognized blacklist results.
  const rawBlacklistStatus = input.blacklistStatus?.toUpperCase();

  const normalizedBlacklistStatus =
    rawBlacklistStatus === "CLEAN" ||
    rawBlacklistStatus === "BLACKLISTED"
      ? rawBlacklistStatus
      : null;

  // Hash provider metadata for provenance; never include the raw IMEI.
  const payloadHash = createHash("sha256")
    .update(
      JSON.stringify({
        provider: input.provider,
        brand: input.brand,
        model: input.model,
        tac: input.tac,
        specifications: input.specifications,
        blacklistStatus: normalizedBlacklistStatus,
        carrierLock: input.carrierLock,
      })
    )
    .digest("hex");

  const evidence: Array<{
    physical_device_id: number;
    evidence_type: string;
    result: string;
    source_type: string;
    source_name: string;
    confidence: number | null;
    observed_at: string;
    metadata: Record<string, unknown>;
  }> = [
    {
      physical_device_id: input.physicalDeviceId,
      evidence_type: "device_identification",
      result: "identified",
      source_type: "external_provider",
      source_name: input.provider,
      confidence: null,
      observed_at: observedAt,
      metadata: {
        brand: input.brand,
        model: input.model,
        tac: input.tac,
        specifications: input.specifications ?? null,
      },
    },
  ];

  if (normalizedBlacklistStatus !== null) {
    evidence.push({
      physical_device_id: input.physicalDeviceId,
      evidence_type: "blacklist_status",
      result: normalizedBlacklistStatus.toLowerCase(),
      source_type: "external_provider",
      source_name: input.provider,
      confidence: null,
      observed_at: observedAt,
      metadata: {},
    });
  }

  if (input.carrierLock !== null) {
    evidence.push({
      physical_device_id: input.physicalDeviceId,
      evidence_type: "carrier_lock",
      result: input.carrierLock ? "locked" : "unlocked",
      source_type: "external_provider",
      source_name: input.provider,
      confidence: null,
      observed_at: observedAt,
      metadata: {},
    });
  }

  const { error: evidenceError } = await supabaseAdmin
    .from("device_evidence")
    .insert(evidence);

  if (evidenceError) {
    console.error(
      "Device evidence persistence failed:",
      evidenceError.message
    );
    throw new Error("Could not persist device evidence");
  }

  // The schema requires a catalogue device or variant for source records.
  const { data: physicalDevice, error: deviceError } = await supabaseAdmin
    .from("physical_devices")
    .select("device_id, variant_id")
    .eq("id", input.physicalDeviceId)
    .single();

  if (deviceError || !physicalDevice) {
    console.error(
      "Physical-device lookup failed:",
      deviceError?.message ?? "No record found"
    );
    throw new Error("Could not retrieve physical device");
  }

  if (
    physicalDevice.device_id !== null ||
    physicalDevice.variant_id !== null
  ) {
    const verificationStatus =
      normalizedBlacklistStatus !== null || input.carrierLock !== null
        ? "partial"
        : "identification_only";

    const { error: sourceError } = await supabaseAdmin
      .from("device_data_sources")
      .insert({
        device_id: physicalDevice.device_id,
        variant_id: physicalDevice.variant_id,
        source_name: input.provider,
        retrieved_at: observedAt,
        payload_hash: payloadHash,
        metadata: {
          record_type: "imei_identification",
          model: input.model,
          verification_status: verificationStatus,
        },
      });

    if (sourceError) {
      console.error(
        "Device source persistence failed:",
        sourceError.message
      );
      throw new Error("Could not persist provider source");
    }
  }
}
