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

import { reconcileDevice } from "@/lib/rebox/catalog-reconciliation";

const device = {
  id: 1,
  brand: "Apple",
  model: "iPhone 15 Pro",
  model_number: "A3102",
  category: "smartphone",
  release_year: 2023,
  specifications: { processor: "A17 Pro" },
};

function queryResult(data: unknown, error: unknown = null) {
  const query: Record<string, any> = {};

  for (const method of ["select", "ilike", "limit"]) {
    query[method] = vi.fn(() => query);
  }

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

describe("reconcileDevice service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a matched device", async () => {
    queueResults({ data: [device] });

    const result = await reconcileDevice("Apple", "iPhone 15 Pro");

    expect(result.status).toBe("matched");
    expect(result.device).toEqual(device);
    expect(mocks.from).toHaveBeenCalledWith("devices");
  });

  it("returns unmatched when no device exists", async () => {
    queueResults({ data: [] });

    const result = await reconcileDevice("Apple", "Unknown Device");

    expect(result).toEqual({
      status: "unmatched",
      device: null,
    });
  });

  it("returns ambiguous when multiple devices match", async () => {
    queueResults({
      data: [device, { ...device, id: 2 }],
    });

    const result = await reconcileDevice("Apple", "iPhone 15 Pro");

    expect(result).toEqual({
      status: "ambiguous",
      device: null,
    });
  });

  it("trims brand and model before querying", async () => {
    queueResults({ data: [device] });

    await reconcileDevice("  Apple  ", "  iPhone 15 Pro  ");

    const query = mocks.from.mock.results[0].value;

    expect(query.ilike).toHaveBeenNthCalledWith(1, "brand", "Apple");
    expect(query.ilike).toHaveBeenNthCalledWith(2, "model", "iPhone 15 Pro");
  });

  it("escapes LIKE wildcard characters", async () => {
    queueResults({ data: [] });

    await reconcileDevice("Apple%", "iPhone_15\\Pro");

    const query = mocks.from.mock.results[0].value;

    expect(query.ilike).toHaveBeenNthCalledWith(1, "brand", "Apple\\%");
    expect(query.ilike).toHaveBeenNthCalledWith(2, "model", "iPhone\\_15\\\\Pro");
  });

  it("limits matching results to two records", async () => {
    queueResults({ data: [device] });

    await reconcileDevice("Apple", "iPhone 15 Pro");

    const query = mocks.from.mock.results[0].value;

    expect(query.limit).toHaveBeenCalledWith(2);
  });

  it("throws a controlled error when the catalogue lookup fails", async () => {
    queueResults({
      data: null,
      error: { message: "Database unavailable" },
    });

    await expect(
      reconcileDevice("Apple", "iPhone 15 Pro"),
    ).rejects.toThrow("Catalogue reconciliation failed");
  });
});

