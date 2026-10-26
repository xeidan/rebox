
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  detectDevice: vi.fn(),
  lookupImei: vi.fn(),
  reconcileDevice: vi.fn(),
  registerPhysicalDevice: vi.fn(),
  persistDeviceEvidence: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/rebox/device-detection", () => ({
  detectDevice: mocks.detectDevice,
}));

vi.mock("@/lib/rebox/providers/imei-info", () => ({
  lookupImei: mocks.lookupImei,
}));

vi.mock("@/lib/rebox/catalog-reconciliation", () => ({
  reconcileDevice: mocks.reconcileDevice,
}));

vi.mock("@/lib/rebox/register-physical-device", () => ({
  registerPhysicalDevice: mocks.registerPhysicalDevice,
}));

vi.mock("@/lib/rebox/persist-device-evidence", () => ({
  persistDeviceEvidence: mocks.persistDeviceEvidence,
}));

vi.mock("@/lib/rebox/rate-limit", () => ({
  imeiLookupRateLimit: {
    limit: mocks.rateLimit,
  },
}));

import { POST } from "@/app/api/devices/identify/route";

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {
    "x-forwarded-for": "203.0.113.10",
  }
): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/devices/identify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    }
  );
}

function makeInvalidJsonRequest(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/devices/identify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.10",
      },
      body: "{invalid-json",
    }
  );
}

describe("POST /api/devices/identify", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.rateLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60_000,
    });

    mocks.detectDevice.mockResolvedValue({
      detected: true,
      device: {
        id: 1,
        brand: "Apple",
        model: "iPhone 15 Pro",
      },
      variant: null,
      confidence: 1,
    });

    mocks.lookupImei.mockResolvedValue({
      provider: "imei.info",
      identifierType: "imei",
      device: {
        brand: "Apple",
        model: "iPhone 16 Plus",
        tac: "35297335",
        specifications: null,
      },
      verification: {
        blacklistStatus: null,
        carrierLock: null,
        status: "identification_only",
      },
    });

    mocks.reconcileDevice.mockResolvedValue({
      status: "matched",
      device: {
        id: 2,
        brand: "Apple",
        model: "iPhone 16 Plus",
      },
    });

    mocks.registerPhysicalDevice.mockResolvedValue(123);
    mocks.persistDeviceEvidence.mockResolvedValue(undefined);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(makeInvalidJsonRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON request body.");
    expect(mocks.lookupImei).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await POST(makeRequest({ type: "imei" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Provide an identifier type and value."
    );
  });

  it("returns 400 for an unsupported identifier type", async () => {
    const response = await POST(
      makeRequest({
        type: "mac_address",
        value: "AA:BB:CC:DD:EE:FF",
      })
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Unsupported identifier type.");
    expect(mocks.lookupImei).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty identifier", async () => {
    const response = await POST(
      makeRequest({ type: "imei", value: "   " })
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Provide a valid device identifier."
    );
    expect(mocks.lookupImei).not.toHaveBeenCalled();
  });

  it("returns 400 for an identifier longer than 120 characters", async () => {
    const response = await POST(
      makeRequest({
        type: "model",
        value: "A".repeat(121),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.detectDevice).not.toHaveBeenCalled();
    expect(mocks.lookupImei).not.toHaveBeenCalled();
  });

  it("rejects an invalid IMEI before rate limiting or provider lookup", async () => {
    const response = await POST(
      makeRequest({ type: "imei", value: "12345" })
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "IMEI must contain exactly 15 digits."
    );
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.lookupImei).not.toHaveBeenCalled();
    expect(mocks.registerPhysicalDevice).not.toHaveBeenCalled();
    expect(mocks.persistDeviceEvidence).not.toHaveBeenCalled();
  });

  it("uses the Rebox catalogue for model-number lookups", async () => {
    const response = await POST(
      makeRequest({
        type: "model_number",
        value: "A3102",
      })
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.source).toBe("rebox_catalog");
    expect(mocks.detectDevice).toHaveBeenCalledWith({
      type: "model_number",
      value: "A3102",
    });
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.lookupImei).not.toHaveBeenCalled();
    expect(mocks.registerPhysicalDevice).not.toHaveBeenCalled();
  });

  it("identifies a valid IMEI and registers the physical device", async () => {
    const imei = "352973354630164";

    const response = await POST(
      makeRequest({ type: "imei", value: imei })
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.source).toBe("imei.info");
    expect(body.physicalDeviceId).toBe(123);

    expect(mocks.rateLimit).toHaveBeenCalledWith("203.0.113.10");
    expect(mocks.lookupImei).toHaveBeenCalledWith(imei);
    expect(mocks.reconcileDevice).toHaveBeenCalledWith(
      "Apple",
      "iPhone 16 Plus"
    );

    expect(mocks.registerPhysicalDevice).toHaveBeenCalledWith({
      identifierType: "imei",
      identifierValue: imei,
      deviceId: 2,
      variantId: null,
    });

    expect(mocks.persistDeviceEvidence).toHaveBeenCalledWith({
      physicalDeviceId: 123,
      provider: "imei.info",
      brand: "Apple",
      model: "iPhone 16 Plus",
      tac: "35297335",
      specifications: null,
      blacklistStatus: null,
      carrierLock: null,
    });
  });

  it("allows registration when the catalogue match is ambiguous", async () => {
    mocks.reconcileDevice.mockResolvedValue({
      status: "ambiguous",
      device: null,
    });

    const response = await POST(
      makeRequest({
        type: "imei",
        value: "352973354630164",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.registerPhysicalDevice).toHaveBeenCalledWith({
      identifierType: "imei",
      identifierValue: "352973354630164",
      deviceId: null,
      variantId: null,
    });
  });

  it("returns 429 when the caller exceeds the rate limit", async () => {
    mocks.rateLimit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 30_000,
    });

    const response = await POST(
      makeRequest({
        type: "imei",
        value: "352973354630164",
      })
    );

    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toContain("Too many IMEI lookup requests");
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(mocks.lookupImei).not.toHaveBeenCalled();
    expect(mocks.registerPhysicalDevice).not.toHaveBeenCalled();
  });

  it("returns 503 when the client IP is unavailable", async () => {
    const response = await POST(
      makeRequest(
        {
          type: "imei",
          value: "352973354630164",
        },
        {}
      )
    );

    expect(response.status).toBe(503);
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.lookupImei).not.toHaveBeenCalled();
  });

  it("returns a safe error when the provider fails", async () => {
    mocks.lookupImei.mockRejectedValue(
      new Error("Provider request failed for IMEI 352973354630164")
    );

    const response = await POST(
      makeRequest({
        type: "imei",
        value: "352973354630164",
      })
    );

    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe(
      "Device identification is temporarily unavailable."
    );
    expect(JSON.stringify(body)).not.toContain("352973354630164");
    expect(mocks.registerPhysicalDevice).not.toHaveBeenCalled();
    expect(mocks.persistDeviceEvidence).not.toHaveBeenCalled();
  });

  it("returns a safe error when registration fails", async () => {
    mocks.registerPhysicalDevice.mockRejectedValue(
      new Error("Database constraint failure")
    );

    const response = await POST(
      makeRequest({
        type: "imei",
        value: "352973354630164",
      })
    );

    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe(
      "Device identification is temporarily unavailable."
    );
    expect(mocks.persistDeviceEvidence).not.toHaveBeenCalled();
  });

  it("does not expose provider secrets or raw identifiers in responses", async () => {
    mocks.lookupImei.mockRejectedValue(
      new Error(
        "API_KEY=super-secret-token; failed IMEI 352973354630164"
      )
    );

    const response = await POST(
      makeRequest({
        type: "imei",
        value: "352973354630164",
      })
    );

    const body = await response.json();
    const responseText = JSON.stringify(body);

    expect(response.status).toBe(502);
    expect(responseText).not.toContain("super-secret-token");
    expect(responseText).not.toContain("352973354630164");
  });
});
