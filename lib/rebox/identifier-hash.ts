import "server-only";
import { createHmac } from "node:crypto";

export function hashDeviceIdentifier(value: string): string {
  const secret = process.env.REBOX_IDENTIFIER_HMAC_SECRET;

  if (!secret) {
    throw new Error("Missing REBOX_IDENTIFIER_HMAC_SECRET");
  }

  const normalized = value.replace(/\s+/g, "").toUpperCase();

  if (!normalized) {
    throw new Error("Device identifier cannot be empty");
  }

  return createHmac("sha256", secret)
    .update(normalized, "utf8")
    .digest("hex");
}