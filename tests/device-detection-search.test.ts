import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  detectDevice: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/rebox/device-detection", () => ({
  detectDevice: mocks.detectDevice,
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { POST as detectPOST } from "@/app/api/devices/detect/route";
import { POST as searchPOST } from "@/app/api/devices/search/route";

function makeRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function queryResult(data: unknown, error: unknown = null) {
  const query: Record<string, unknown> = {};

  for (const method of ["select", "ilike", "limit", "in"]) {
    query[method] = vi.fn(() => query);
  }

  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data, error }).then(resolve, reject);

  return query;
}

describe("POST /api/devices/detect", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.detectDevice.mockResolvedValue({
      detected: true,
      status: "matched",
      device: { id: 1, brand: "Apple", model: "iPhone 15 Pro" },
      variant: { id: 10, model_number: "A3102", region: "Global" },
      variants: [{ id: 10, model_number: "A3102", region: "Global" }],
      confidence: 1,
    });
  });

  it("rejects missing fields", async () => {
    const response = await detectPOST(
      makeRequest("http://localhost/api/devices/detect", { type: "model" }),
    );

    expect(response.status).toBe(400);
    expect(mocks.detectDevice).not.toHaveBeenCalled();
  });

  it("rejects unsupported identifier types", async () => {
    const response = await detectPOST(
      makeRequest("http://localhost/api/devices/detect", {
        type: "imei",
        value: "123456789012345",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.detectDevice).not.toHaveBeenCalled();
  });

  it("rejects empty and oversized identifiers", async () => {
    const empty = await detectPOST(
      makeRequest("http://localhost/api/devices/detect", {
        type: "model",
        value: "   ",
      }),
    );

    const oversized = await detectPOST(
      makeRequest("http://localhost/api/devices/detect", {
        type: "model",
        value: "A".repeat(121),
      }),
    );

    expect(empty.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(mocks.detectDevice).not.toHaveBeenCalled();
  });

  it("returns the catalogue match and variants", async () => {
    const response = await detectPOST(
      makeRequest("http://localhost/api/devices/detect", {
        type: "model_number",
        value: " A3102 ",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.detected).toBe(true);
    expect(body.device.model).toBe("iPhone 15 Pro");
    expect(body.variants).toHaveLength(1);
    expect(mocks.detectDevice).toHaveBeenCalledWith({
      type: "model_number",
      value: "A3102",
    });
  });

  it("returns ambiguous model-number candidates", async () => {
    mocks.detectDevice.mockResolvedValue({
      detected: false,
      status: "ambiguous",
      reason: "Multiple regional variants match.",
      candidates: [
        {
          device: { id: 1, brand: "Apple", model: "iPhone 15 Pro" },
          variants: [
            { id: 10, model_number: "A3102", region: "Global" },
            { id: 11, model_number: "A3102", region: "Other" },
          ],
        },
      ],
      confidence: 0,
    });

    const response = await detectPOST(
      makeRequest("http://localhost/api/devices/detect", {
        type: "model_number",
        value: "A3102",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ambiguous");
    expect(body.candidates[0].variants).toHaveLength(2);
  });
});

describe("POST /api/devices/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an empty search query", async () => {
    const response = await searchPOST(
      makeRequest("http://localhost/api/devices/search", {
        query: "   ",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("returns catalogue candidates with their variants and removes duplicates", async () => {
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

    const results = [
      [device],
      [device],
      [device],
      [variant],
    ];

    mocks.from.mockImplementation(() => queryResult(results.shift() ?? []));

    const response = await searchPOST(
      makeRequest("http://localhost/api/devices/search", {
        query: "Apple iPhone 15 Pro",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("candidates");
    expect(body.candidates).toHaveLength(1);
    expect(body.candidates[0].device.model).toBe("iPhone 15 Pro");
    expect(body.candidates[0].variants).toHaveLength(1);
    expect(body.candidates[0].variants[0].model_number).toBe("A3102");
    expect(mocks.from).toHaveBeenCalledTimes(4);
  });

  it("returns unmatched when no catalogue devices are found", async () => {
    mocks.from.mockImplementation(() => queryResult([]));

    const response = await searchPOST(
      makeRequest("http://localhost/api/devices/search", {
        query: "Unknown Device",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("unmatched");
    expect(body.candidates).toEqual([]);
    expect(mocks.from).toHaveBeenCalledTimes(3);
  });

  it("returns a safe error when catalogue lookup fails", async () => {
    mocks.from.mockImplementation(() =>
      queryResult(null, { message: "Database unavailable" }),
    );

    const response = await searchPOST(
      makeRequest("http://localhost/api/devices/search", {
        query: "Apple iPhone 15 Pro",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Device catalogue search failed.",
    });
  });
});
