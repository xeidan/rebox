import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

import { GET } from "../app/api/devices/image/route";

const request = (name?: string) =>
  new NextRequest(
    `http://localhost:3000/api/devices/image${
      name === undefined ? "" : `?name=${encodeURIComponent(name)}`
    }`,
  );

describe("GET /api/devices/image", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.MOBILEAPI_KEY;
  });

  it("rejects a missing name", async () => {
    const response = await GET(request());
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects names longer than 100 characters", async () => {
    const response = await GET(request("a".repeat(101)));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the API key is missing", async () => {
    const response = await GET(request("iPhone 15"));
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a validated device and HTTPS image", async () => {
    process.env.MOBILEAPI_KEY = "test-key";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        devices: [
          {
            id: "123",
            name: " iPhone 15 ",
            main_image_url: "https://images.example.com/phone.jpg",
          },
        ],
      }),
    });

    const response = await GET(request("iPhone 15"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      device: {
        id: "123",
        name: "iPhone 15",
        image: "https://images.example.com/phone.jpg",
      },
    });
  });

  it("rejects unsafe image URL schemes", async () => {
    process.env.MOBILEAPI_KEY = "test-key";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        devices: [
          {
            id: "123",
            name: "iPhone 15",
            main_image_url: "javascript:alert(1)",
          },
        ],
      }),
    });

    const response = await GET(request("iPhone 15"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      device: { image: null },
    });
  });

  it("returns no device for malformed provider data", async () => {
    process.env.MOBILEAPI_KEY = "test-key";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ devices: [{ id: "123" }] }),
    });

    const response = await GET(request("iPhone 15"));
    await expect(response.json()).resolves.toEqual({ device: null });
  });

  it("handles provider failures safely", async () => {
    process.env.MOBILEAPI_KEY = "test-key";
    fetchMock.mockRejectedValue(new Error("provider failure"));

    const response = await GET(request("iPhone 15"));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Device lookup failed.",
    });
  });
});
