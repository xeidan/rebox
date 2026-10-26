
import "server-only";

type ImeiProviderResponse = {
  status?: string;
  detail?: string;
  imei?: string;
  result?: {
    imei?: string;
    brand?: string;
    brand_name?: string;
    model?: string;
    tac?: string;
    specifications?: unknown;
    blacklist_status?: string;
    blacklistStatus?: string;
    carrier_lock?: boolean;
    carrierLock?: boolean;
  };
};

export async function lookupImei(imei: string) {
  const token = process.env.IMEI_INFO_API_TOKEN;

  if (!token) {
    throw new Error("Missing IMEI_INFO_API_TOKEN");
  }

  const normalized = imei.replace(/\s+/g, "");

  if (!/^\d{15}$/.test(normalized)) {
    throw new Error("IMEI must contain exactly 15 digits");
  }

  const url = new URL(
    "https://dash.imei.info/api-sync/check/0/"
  );

  url.searchParams.append("API_KEY", token);
  url.searchParams.append("format", "json");
  url.searchParams.append("imei", normalized);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const raw = await response.text();

  let data: ImeiProviderResponse;

  try {
    data = JSON.parse(raw) as ImeiProviderResponse;
  } catch {
    throw new Error("IMEI provider returned invalid JSON");
  }

  if (!response.ok || data.detail) {
    throw new Error(
      `IMEI provider error: ${data.detail ?? `HTTP ${response.status}`}`
    );
  }

  if (data.status?.toLowerCase() !== "done" || !data.result) {
    throw new Error("IMEI provider has not returned a completed result");
  }

  const result = data.result;
  const brand = result.brand_name ?? result.brand ?? "";
  const model = result.model ?? "";

  if (!brand.trim() || !model.trim()) {
    throw new Error("IMEI provider returned no device identification");
  }

  const rawBlacklist =
    result.blacklist_status ?? result.blacklistStatus;

  const blacklistStatus =
    rawBlacklist?.toUpperCase() === "CLEAN" ||
    rawBlacklist?.toUpperCase() === "BLACKLISTED"
      ? rawBlacklist.toUpperCase()
      : null;

  const carrierLock =
    typeof result.carrier_lock === "boolean"
      ? result.carrier_lock
      : typeof result.carrierLock === "boolean"
        ? result.carrierLock
        : null;

  return {
    provider: "imei.info",
    identifierType: "imei",
    device: {
      brand,
      model,
      tac: result.tac ?? null,
      specifications: result.specifications ?? null,
    },
    verification: {
      blacklistStatus,
      carrierLock,
      status:
        blacklistStatus !== null || carrierLock !== null
          ? "partial"
          : "identification_only",
    },
  };
}
