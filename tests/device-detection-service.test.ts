
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { detectDevice } from "@/lib/rebox/device-detection";

const device = {
  id: 1,
  brand: "Apple",
  model: "iPhone 15 Pro",
  model_number: null,
  category: "Smartphone",
  release_year: 2023,
  specifications: { processor: "A17 Pro" },
};

const variant = {
  id: 10,
  device_id: 1,
  model_number: "A3102",
  region: "Global",
  storage: "256GB",
  connectivity: "5G",
  specifications: {},
};

function queryResult(data: unknown, error: unknown = null) {
  const query: Record<string, any> = {};

  for (const method of ["select", "eq", "ilike", "limit", "in"]) {
    query[method] = vi.fn(() => query);
  }

  query.maybeSingle = vi.fn().mockResolvedValue({ data, error });

  query.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve({ data, error }).then(resolve, reject);

  return query;
}

function queueResults(
  ...results: Array<{ data: unknown; error?: unknown }>
) {
  const queue = [...results];

  mocks.from.mockImplementation(() => {
    const result = queue.shift();

    if (!result) {
      throw new Error("Unexpected Supabase query");
    }

    return queryResult(result.data, result.error ?? null);
  });
}

describe("detectDevice service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("identifies an exact model number and returns its variant", async () => {
    queueResults(
      { data: [variant] },
      { data: device },
      { data: [variant] },
    );

    const result = await detectDevice({
      type: "model_number",
      value: "A3102",
    });

    expect(result.detected).toBe(true);
    expect(result.status).toBe("matched");
    expect(result.device).toEqual(device);
    expect(result.variant).toEqual(variant);
    expect(result.confidence).toBe(1);
    expect(result.confidenceLevel).toBe("exact");
    expect(result.matchMethod).toBe("exact_model_number");
  });

  it("identifies an exact catalogue model without claiming a hardware variant", async () => {
    queueResults(
      { data: [] },
      { data: [device] },
      { data: [variant] },
    );

    const result = await detectDevice({
      type: "model",
      value: "iPhone 15 Pro",
    });

    expect(result.detected).toBe(true);
    expect(result.status).toBe("matched");
    expect(result.device).toEqual(device);
    expect(result.variant).toBeNull();
    expect(result.variants).toEqual([variant]);
    expect(result.confidence).toBe(0.95);
    expect(result.confidenceLevel).toBe("strong");
    expect(result.matchMethod).toBe("exact_catalogue_model");
  });

  it("returns partial matches as suggestions, not confirmed identifications", async () => {
    queueResults(
      { data: [] },
      { data: [] },
      { data: [device] },
      { data: [variant] },
    );

    const result = await detectDevice({
      type: "model",
      value: "15 Pro",
    });

    expect(result.detected).toBe(false);
    expect(result.status).toBe("partial");
    expect(result.device).toBeNull();
    expect(result.variant).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.confidenceLevel).toBe("unknown");
    expect(result.matchMethod).toBe("partial_catalogue_model");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].device).toEqual(device);
    expect(result.candidates[0].variants).toEqual([variant]);
  });

  it("returns unmatched when the device is not in the catalogue", async () => {
    queueResults(
      { data: [] },
      { data: [] },
      { data: [] },
    );

    const result = await detectDevice({
      type: "model",
      value: "Unknown Device",
    });

    expect(result.detected).toBe(false);
    expect(result.status).toBe("unmatched");
    expect(result.device).toBeNull();
    expect(result.variant).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("returns ambiguous when multiple catalogue devices match", async () => {
    const secondDevice = {
      ...device,
      id: 2,
      brand: "Samsung",
      model: "iPhone 15 Pro",
    };

    queueResults(
      { data: [] },
      { data: [device, secondDevice] },
    );

    const result = await detectDevice({
      type: "model",
      value: "iPhone 15 Pro",
    });

    expect(result.detected).toBe(false);
    expect(result.status).toBe("ambiguous");
    expect(result.candidates).toHaveLength(2);
  });

  it("returns variant_ambiguous when multiple variants belong to one device", async () => {
    const secondVariant = {
      ...variant,
      id: 11,
      region: "Other",
    };

    queueResults(
      { data: [variant, secondVariant] },
      { data: [device] },
    );

    const result = await detectDevice({
      type: "model_number",
      value: "A3102",
    });

    expect(result.detected).toBe(true);
    expect(result.status).toBe("variant_ambiguous");
    expect(result.device).toEqual(device);
    expect(result.variant).toBeNull();
    expect(result.variants).toEqual([variant, secondVariant]);
    expect(result.confidenceLevel).toBe("strong");
  });

  it("resolves a registered identifier with valid confidence", async () => {
    queueResults(
      {
        data: [{
          id: 20,
          identifier_type: "model",
          identifier_value: "iPhone 15 Pro",
          confidence: 0.99,
          device,
        }],
      },
      { data: [variant] },
    );

    const result = await detectDevice({
      type: "model",
      value: "iPhone 15 Pro",
    });

    expect(result.detected).toBe(true);
    expect(result.status).toBe("matched");
    expect(result.device).toEqual(device);
    expect(result.variant).toBeNull();
    expect(result.variants).toEqual([variant]);
    expect(result.confidence).toBe(0.99);
    expect(result.matchMethod).toBe("registered_identifier");
  });

  it("does not confirm registered identifiers with missing confidence", async () => {
    queueResults(
      {
        data: [{
          id: 20,
          identifier_type: "model",
          identifier_value: "iPhone 15 Pro",
          confidence: null,
          device,
        }],
      },
      { data: [variant] },
    );

    const result = await detectDevice({
      type: "model",
      value: "iPhone 15 Pro",
    });

    expect(result.detected).toBe(false);
    expect(result.status).toBe("unverified");
    expect(result.device).toEqual(device);
    expect(result.confidence).toBe(0);
    expect(result.confidenceLevel).toBe("unknown");
  });

  it.each([NaN, -0.1, 1.1])(
    "does not confirm registered identifiers with invalid confidence: %s",
    async (confidence) => {
      queueResults(
        {
          data: [{
            id: 20,
            identifier_type: "model",
            identifier_value: "iPhone 15 Pro",
            confidence,
            device,
          }],
        },
        { data: [variant] },
      );

      const result = await detectDevice({
        type: "model",
        value: "iPhone 15 Pro",
      });

      expect(result.detected).toBe(false);
      expect(result.status).toBe("unverified");
      expect(result.device).toEqual(device);
      expect(result.confidence).toBe(0);
    },
  );

  it("returns unmatched when neither the registered identifier nor catalogue resolves a device", async () => {
  queueResults(
    {
      data: [{
        id: 20,
        identifier_type: "model",
        identifier_value: "iPhone 15 Pro",
        confidence: 0.99,
        device: null,
      }],
    },
    { data: [] }, // Exact catalogue lookup
    { data: [] }, // Partial catalogue lookup
  );

  const result = await detectDevice({
    type: "model",
    value: "iPhone 15 Pro",
  });

  expect(result.detected).toBe(false);
  expect(result.status).toBe("unmatched");
  expect(result.device).toBeNull();
});

  it("returns ambiguous when multiple registered identifiers match", async () => {
    queueResults({
      data: [
        { id: 20, device },
        { id: 21, device: { ...device, id: 2 } },
      ],
    });

    const result = await detectDevice({
      type: "model",
      value: "iPhone 15 Pro",
    });

    expect(result.detected).toBe(false);
    expect(result.status).toBe("ambiguous");
  });

  it("rejects empty identifiers", async () => {
    await expect(
      detectDevice({ type: "model", value: "   " }),
    ).rejects.toThrow("Invalid device identifier");

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects identifiers longer than 120 characters", async () => {
    await expect(
      detectDevice({ type: "model", value: "A".repeat(121) }),
    ).rejects.toThrow("Invalid device identifier");

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects unsupported identifier types", async () => {
    await expect(
      detectDevice({
        type: "imei" as "model",
        value: "123456789012345",
      }),
    ).rejects.toThrow("Invalid device identifier");

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects non-string identifier values", async () => {
    await expect(
      detectDevice({
        type: "model",
        value: 123 as unknown as string,
      }),
    ).rejects.toThrow("Invalid device identifier");

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("throws a controlled error when the variant lookup fails", async () => {
    queueResults({
      data: null,
      error: { message: "Database unavailable" },
    });

    await expect(
      detectDevice({
        type: "model_number",
        value: "A3102",
      }),
    ).rejects.toThrow("Device variant lookup failed");
  });

  it("throws a controlled error when the catalogue lookup fails", async () => {
    queueResults(
      { data: [] },
      {
        data: null,
        error: { message: "Database unavailable" },
      },
    );

    await expect(
      detectDevice({
        type: "model",
        value: "iPhone 15 Pro",
      }),
    ).rejects.toThrow("Device catalogue lookup failed");
  });
});
