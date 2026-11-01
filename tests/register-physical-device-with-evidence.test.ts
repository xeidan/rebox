
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  hashDeviceIdentifier: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    rpc: mocks.rpc,
  },
}));

vi.mock("@/lib/rebox/identifier-hash", () => ({
  hashDeviceIdentifier: mocks.hashDeviceIdentifier,
}));

import { registerPhysicalDeviceWithEvidence } from "@/lib/rebox/register-physical-device-with-evidence";

describe("registerPhysicalDeviceWithEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.hashDeviceIdentifier.mockReturnValue("a".repeat(64));
    mocks.rpc.mockResolvedValue({
      data: 123,
      error: null,
    });
  });

  const validInput = {
    identifierType: "imei" as const,
    identifierValue: "352973354630164",
    deviceId: 2,
    variantId: null,
    provider: "imei.info",
    brand: "Apple",
    model: "iPhone 16 Plus",
    tac: "35297335",
    specifications: null,
    blacklistStatus: "CLEAN",
    carrierLock: false,
  };

  it("calls the combined RPC and returns the physical device ID", async () => {
    const id = await registerPhysicalDeviceWithEvidence(validInput);

    expect(id).toBe(123);
    expect(mocks.hashDeviceIdentifier).toHaveBeenCalledWith(
      "352973354630164"
    );

    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    const [functionName, args] = mocks.rpc.mock.calls[0];

    expect(functionName).toBe(
      "register_physical_device_with_evidence"
    );
    expect(args).toMatchObject({
      p_device_id: 2,
      p_variant_id: null,
      p_identifier_type: "imei",
      p_identifier_hash: "a".repeat(64),
      p_last_four: "0164",
      p_provider: "imei.info",
      p_brand: "Apple",
      p_model: "iPhone 16 Plus",
      p_tac: "35297335",
      p_specifications: null,
      p_blacklist_status: "CLEAN",
      p_carrier_lock: false,
    });
    expect(args.p_payload_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects an invalid IMEI before calling Supabase", async () => {
    await expect(
      registerPhysicalDeviceWithEvidence({
        ...validInput,
        identifierValue: "12345",
      })
    ).rejects.toThrow("Invalid IMEI");

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("normalizes an unsupported blacklist status to null", async () => {
    await registerPhysicalDeviceWithEvidence({
      ...validInput,
      blacklistStatus: "UNKNOWN",
    });

    const [, args] = mocks.rpc.mock.calls[0];

    expect(args.p_blacklist_status).toBeNull();
  });

  it("throws safely when the RPC returns an error", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "Database constraint failure" },
    });

    await expect(
      registerPhysicalDeviceWithEvidence(validInput)
    ).rejects.toThrow("Could not complete device registration");
  });

  it("rejects an invalid RPC response", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      registerPhysicalDeviceWithEvidence(validInput)
    ).rejects.toThrow("Invalid physical-device registration response");
  });
});
