
import { beforeAll, describe, expect, it } from "vitest";

let hashDeviceIdentifier: (value: string) => string;

beforeAll(async () => {
  process.env.REBOX_IDENTIFIER_HMAC_SECRET ??=
    "test-only-secret-for-unit-tests";

  const module = await import("@/lib/rebox/identifier-hash");
  hashDeviceIdentifier = module.hashDeviceIdentifier;
});

describe("hashDeviceIdentifier", () => {
  it("returns a 64-character hexadecimal hash", () => {
    expect(hashDeviceIdentifier("123456789012345")).toMatch(
      /^[a-f0-9]{64}$/
    );
  });

  it("returns the same hash for the same identifier", () => {
    expect(hashDeviceIdentifier("123456789012345")).toBe(
      hashDeviceIdentifier("123456789012345")
    );
  });

  it("normalizes whitespace and letter casing", () => {
    expect(hashDeviceIdentifier(" abC123 ")).toBe(
      hashDeviceIdentifier("ABC123")
    );
  });

  it("does not return the original identifier", () => {
    const identifier = "123456789012345";

    expect(hashDeviceIdentifier(identifier)).not.toBe(identifier);
  });
});
