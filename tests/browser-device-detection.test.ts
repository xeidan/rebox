import { describe, expect, it } from "vitest";
import {
  detectBrowser,
  detectOperatingSystem,
  detectDeviceType,
} from "@/components/intelligence/device-detection";

describe("Browser detection", () => {
  it("identifies Chrome", () => {
    expect(
      detectBrowser("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36"),
    ).toBe("Chrome");
  });

  it("identifies Microsoft Edge", () => {
    expect(
      detectBrowser("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 Edg/120.0"),
    ).toBe("Microsoft Edge");
  });

  it("identifies Firefox", () => {
    expect(detectBrowser("Mozilla/5.0 Firefox/120.0")).toBe("Firefox");
  });

  it("identifies Safari", () => {
    expect(
      detectBrowser("Mozilla/5.0 AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15"),
    ).toBe("Safari");
  });

  it("uses browser client hints when available", () => {
    expect(
      detectBrowser("Mozilla/5.0", [
        { brand: "Not A Brand", version: "99" },
        { brand: "Microsoft Edge", version: "120" },
      ]),
    ).toBe("Microsoft Edge");
  });
});

describe("Operating-system detection", () => {
  it.each([
    ["Android", "Mozilla/5.0 (Linux; Android 14; Pixel 8)"],
    ["iOS", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"],
    ["Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"],
    ["macOS", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"],
    ["ChromeOS", "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)"],
    ["Linux", "Mozilla/5.0 (X11; Linux x86_64)"],
  ])("identifies %s", (expected, ua) => {
    expect(detectOperatingSystem(ua, false)).toBe(expected);
  });

  it("identifies iPadOS when iPad uses a desktop user agent", () => {
    expect(
      detectOperatingSystem(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
        true,
      ),
    ).toBe("iPadOS");
  });
});

describe("Device category detection", () => {
  it("identifies iPhones as mobile", () => {
    expect(
      detectDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)", false),
    ).toBe("Mobile");
  });

  it("identifies iPads as tablets", () => {
    expect(
      detectDeviceType("Mozilla/5.0 (iPad; CPU OS 17_0)", false),
    ).toBe("Tablet");
  });

  it("identifies Android phones as mobile", () => {
    expect(
      detectDeviceType("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile", false),
    ).toBe("Mobile");
  });

  it("identifies Android tablets as tablets", () => {
    expect(
      detectDeviceType("Mozilla/5.0 (Linux; Android 14; Tablet)", false),
    ).toBe("Tablet");
  });

  it("uses client hints when mobile information is available", () => {
    expect(
      detectDeviceType("Mozilla/5.0", false, true),
    ).toBe("Mobile");
  });

  it("identifies desktop devices", () => {
    expect(
      detectDeviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", false),
    ).toBe("Desktop");
  });
});
