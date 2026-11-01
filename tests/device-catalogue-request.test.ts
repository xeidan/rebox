import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { POST } from "@/app/api/devices/catalogue-request/route";

function makeRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/devices/catalogue-request",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/devices/catalogue-request", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.insert.mockResolvedValue({ error: null });

    mocks.from.mockReturnValue({
      insert: mocks.insert,
    });
  });

  it("submits a valid device request", async () => {
    const response = await POST(
      makeRequest({
        brand: "Apple",
        model: "iPhone 15 Pro",
        model_number: "A3102",
        category: "Smartphone",
        details: "256GB, Global variant",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(mocks.from).toHaveBeenCalledWith("device_catalogue_requests");
    expect(mocks.insert).toHaveBeenCalledWith({
      brand: "Apple",
      model: "iPhone 15 Pro",
      model_number: "A3102",
      category: "Smartphone",
      details: "256GB, Global variant",
      source: "device_page",
    });
  });

  it("trims submitted values", async () => {
    const response = await POST(
      makeRequest({
        brand: " Apple ",
        model: " iPhone 15 Pro ",
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: "Apple",
        model: "iPhone 15 Pro",
      }),
    );
  });

  it("rejects requests without device information", async () => {
    const response = await POST(
      makeRequest({
        category: "Smartphone",
        details: "A device",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects non-string device fields without device information", async () => {
    const response = await POST(
      makeRequest({
        brand: 123,
        model: null,
        model_number: false,
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("truncates fields to their allowed lengths", async () => {
    const response = await POST(
      makeRequest({
        brand: "A".repeat(100),
        model: "B".repeat(150),
        model_number: "C".repeat(100),
        category: "D".repeat(60),
        details: "E".repeat(1200),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith({
      brand: "A".repeat(80),
      model: "B".repeat(120),
      model_number: "C".repeat(80),
      category: "D".repeat(50),
      details: "E".repeat(1000),
      source: "device_page",
    });
  });

  it("silently accepts honeypot bot submissions without inserting", async () => {
    const response = await POST(
      makeRequest({
        website: "https://spam.example",
        brand: "Spam",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("returns a safe error when Supabase insertion fails", async () => {
    mocks.insert.mockResolvedValue({
      error: { message: "Database unavailable" },
    });

    const response = await POST(
      makeRequest({
        brand: "Apple",
        model: "iPhone 15 Pro",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to submit your device request.",
    });
  });
});
