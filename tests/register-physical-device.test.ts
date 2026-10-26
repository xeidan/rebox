import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}));

import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashDeviceIdentifier } from "@/lib/rebox/identifier-hash";
import { registerPhysicalDevice } from "@/lib/rebox/register-physical-device";

const rpcMock = vi.mocked(supabaseAdmin.rpc);

describe("registerPhysicalDevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.REBOX_IDENTIFIER_HMAC_SECRET =
      "test-only-secret-for-unit-tests";

    rpcMock.mockResolvedValue({
      data: 123,
      error: null,
    } as never);
  });

  it("registers a valid IMEI and returns the physical device ID", async () => {
    const physicalDeviceId = await registerPhysicalDevice({
      identifierType: "imei",
      identifierValue: "350545260771498",
      deviceId: 1,
      variantId: null,
    });

    expect(physicalDeviceId).toBe(123);

    expect(rpcMock).toHaveBeenCalledOnce();
    expect(rpcMock).toHaveBeenCalledWith(
      "register_physical_device",
      {
        p_device_id: 1,
        p_variant_id: null,
        p_identifier_type: "imei",
        p_identifier_hash: hashDeviceIdentifier("350545260771498"),
        p_last_four: "1498",
      }
    );
  });

  it("sends the HMAC hash instead of the raw IMEI", async () => {
    const imei = "350545260771498";

    await registerPhysicalDevice({
      identifierType: "imei",
      identifierValue: imei,
      deviceId: null,
      variantId: null,
    });

    const [, params] = rpcMock.mock.calls[0];

    expect(params.p_identifier_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(params.p_identifier_hash).not.toBe(imei);
    expect(params.p_last_four).toBe("1498");
  });

  it("normalizes whitespace and letter casing before hashing", async () => {
    await registerPhysicalDevice({
      identifierType: "serial",
      identifierValue: " abC123 ",
      deviceId: null,
      variantId: null,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      "register_physical_device",
      expect.objectContaining({
        p_identifier_hash: hashDeviceIdentifier("ABC123"),
      })
    );
  });

  it("rejects an invalid IMEI before accessing Supabase", async () => {
    await expect(
      registerPhysicalDevice({
        identifierType: "imei",
        identifierValue: "12345",
        deviceId: null,
        variantId: null,
      })
    ).rejects.toThrow("IMEI must contain exactly 15 digits");

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects a MEID with an invalid format before accessing Supabase", async () => {
    await expect(
      registerPhysicalDevice({
        identifierType: "meid",
        identifierValue: "INVALID-MEID",
        deviceId: null,
        variantId: null,
      })
    ).rejects.toThrow(
      "MEID must contain exactly 14 hexadecimal characters"
    );

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("handles a Supabase registration error safely", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "Database constraint failure" },
    } as never);

    await expect(
      registerPhysicalDevice({
        identifierType: "imei",
        identifierValue: "350545260771498",
        deviceId: 1,
        variantId: null,
      })
    ).rejects.toThrow("Could not register physical device");
  });

  it("rejects an invalid database response", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await expect(
      registerPhysicalDevice({
        identifierType: "imei",
        identifierValue: "350545260771498",
        deviceId: null,
        variantId: null,
      })
    ).rejects.toThrow("Invalid physical-device registration response");
  });
});
