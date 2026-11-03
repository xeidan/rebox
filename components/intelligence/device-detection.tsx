
"use client";

import { useEffect } from "react";

type DeviceType = "Mobile" | "Tablet" | "Desktop";

type UserAgentData = {
  mobile?: boolean;
  platform?: string;
  brands?: { brand: string; version: string }[];
  getHighEntropyValues?: (
    hints: string[],
  ) => Promise<{ model?: string; platform?: string }>;
};

type CatalogueResult = {
  detected: boolean;
  status?: string;
  reason?: string | null;
  device: Record<string, unknown> | null;
  variant: Record<string, unknown> | null;
  variants?: Record<string, unknown>[];
  candidates?: unknown[];
  confidence: number;
  confidenceLevel?: string;
  matchMethod?: string | null;
};

export type DetectedDevice = {
  deviceName: string;
  deviceDetails: string;
  deviceType: DeviceType;
  browser: string;
  detected: boolean;
  operatingSystem?: string;
  model?: string | null;
  catalogueMatch?: CatalogueResult | null;
  identificationLevel?: "device_category" | "catalogue_model";
};

const MODEL_HINT_TIMEOUT = 1500;
const CATALOGUE_TIMEOUT = 2500;

async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  fallback: T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(
          () => resolve(fallback),
          milliseconds,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function detectBrowser(
  ua: string,
  brands?: UserAgentData["brands"],
): string {
  if (brands?.length) {
    const priorities = [
      "Microsoft Edge",
      "Opera",
      "Google Chrome",
      "Chrome",
      "Firefox",
    ];

    for (const name of priorities) {
      const match = brands.find(
        (item) => item.brand.toLowerCase() === name.toLowerCase(),
      );

      if (match) {
        return name === "Google Chrome" ? "Chrome" : name;
      }
    }
  }

  if (/Edg\//i.test(ua)) return "Microsoft Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/FxiOS|Firefox\//i.test(ua)) return "Firefox";
  if (/CriOS\//i.test(ua)) return "Chrome";

  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    return "Chrome";
  }

  if (/Chromium/i.test(ua)) return "Chromium";
  if (/Safari\//i.test(ua)) return "Safari";

  return "Browser";
}

export function detectOperatingSystem(
  ua: string,
  ipadOS: boolean,
): string {
  if (ipadOS) return "iPadOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";

  return "Unknown OS";
}

function normalizePlatform(platform?: string | null): string | null {
  if (!platform) return null;

  const value = platform.toLowerCase();

  if (value.includes("android")) return "Android";
  if (value.includes("iphone") || value.includes("ipad") || value === "ios") {
    return "iOS";
  }
  if (value.includes("windows")) return "Windows";
  if (value.includes("mac")) return "macOS";
  if (value.includes("chrome")) return "ChromeOS";
  if (value.includes("linux")) return "Linux";

  return platform;
}

export function detectDeviceType(
  ua: string,
  ipadOS: boolean,
  mobileHint?: boolean,
): DeviceType {
  const isIPad = /iPad/i.test(ua) || ipadOS;
  const isIPhone = /iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  if (isIPad || (isAndroid && !/Mobile/i.test(ua))) {
    return "Tablet";
  }

  if (
    isIPhone ||
    /Mobi/i.test(ua) ||
    (isAndroid && /Mobile/i.test(ua)) ||
    mobileHint === true
  ) {
    return "Mobile";
  }

  return "Desktop";
}

async function detectModel(
  uaData?: UserAgentData,
): Promise<{ model: string | null; platform: string | null }> {
  if (!uaData?.getHighEntropyValues) {
    return { model: null, platform: null };
  }

  try {
    const hints = await withTimeout(
      uaData.getHighEntropyValues(["model", "platform"]),
      MODEL_HINT_TIMEOUT,
      { model: undefined, platform: undefined },
    );

    return {
      model: hints.model?.trim() || null,
      platform: hints.platform?.trim() || null,
    };
  } catch {
    return { model: null, platform: null };
  }
}

async function matchCatalogue(
  model: string,
): Promise<CatalogueResult | null> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    CATALOGUE_TIMEOUT,
  );

  try {
    const response = await fetch("/api/devices/detect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "model",
        value: model,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const result: unknown = await response.json();

    if (
      !result ||
      typeof result !== "object" ||
      !("detected" in result) ||
      typeof result.detected !== "boolean"
    ) {
      return null;
    }

    return result as CatalogueResult;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function detectCurrentDevice(): Promise<DetectedDevice> {
  const ua = navigator.userAgent;

  const nav = navigator as Navigator & {
    userAgentData?: UserAgentData;
  };

  const uaData = nav.userAgentData;

  const ipadOS =
    /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;

  const isIPad = /iPad/i.test(ua) || ipadOS;
  const isIPhone = /iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  const deviceType = detectDeviceType(
    ua,
    ipadOS,
    uaData?.mobile,
  );

  const browser = detectBrowser(ua, uaData?.brands);

  let operatingSystem =
    detectOperatingSystem(ua, ipadOS);

  let deviceName = "Desktop device";

  if (isIPad) {
    deviceName = "iPad";
  } else if (isIPhone) {
    deviceName = "iPhone";
  } else if (isAndroid) {
    deviceName =
      deviceType === "Tablet"
        ? "Android tablet"
        : "Android device";
  } else if (/Windows/i.test(ua)) {
    deviceName = "Windows PC";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceName = "Mac";
  } else if (/CrOS/i.test(ua)) {
    deviceName = "ChromeOS device";
  } else if (/Linux/i.test(ua)) {
    deviceName = "Linux PC";
  } else if (deviceType === "Mobile") {
    deviceName = "Mobile device";
  } else if (deviceType === "Tablet") {
    deviceName = "Tablet device";
  }

  // Basic browser-based classification is independent of
  // exact hardware identification.
  const { model, platform } = await detectModel(uaData);
  console.log("[REBOX] Browser model hint:", model);
console.log("[REBOX] User agent data:", uaData);

  operatingSystem =
    normalizePlatform(platform) ||
    normalizePlatform(uaData?.platform) ||
    operatingSystem;

  let catalogueMatch: CatalogueResult | null = null;

  if (model) {
    catalogueMatch = await matchCatalogue(model);
  }

  // Only use a catalogue-confirmed device as the exact display name.
  const matchedDevice =
    catalogueMatch?.detected &&
    catalogueMatch.status === "matched" &&
    catalogueMatch.device
      ? catalogueMatch.device
      : null;

  let identificationLevel: DetectedDevice["identificationLevel"] =
    "device_category";

  if (matchedDevice) {
    const brand = String(matchedDevice.brand ?? "");
    const matchedModel = String(matchedDevice.model ?? "");

    if (brand && matchedModel) {
      deviceName = `${brand} ${matchedModel}`;
      identificationLevel = "catalogue_model";
    }
  }

  return {
    deviceName,
    deviceDetails: `${deviceType} · ${operatingSystem} · ${browser}`,
    deviceType,
    browser,
    detected: true,
    operatingSystem,
    model,
    catalogueMatch,
    identificationLevel,
  };
}

export default function DeviceDetection({
  onDetected,
}: {
  onDetected: (device: DetectedDevice) => void;
}) {
  useEffect(() => {
    let active = true;

    detectCurrentDevice()
      .then((device) => {
        if (active) {
          onDetected(device);
        }
      })
      .catch((error) => {
        console.error("[REBOX] Device detection failed:", error);

        if (active) {
          onDetected({
            deviceName: "your device",
            deviceDetails: "Device detection unavailable",
            deviceType: "Desktop",
            browser: "Unknown",
            detected: false,
            operatingSystem: "Unknown OS",
            model: null,
            catalogueMatch: null,
            identificationLevel: "device_category",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [onDetected]);

  return null;
}
