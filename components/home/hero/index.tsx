
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DeviceDetection, {
  type DetectedDevice,
} from "@/components/intelligence/device-detection";

const SUPABASE_STORAGE_URL =
  "https://dahlqmbcazlotvybyykx.supabase.co/storage/v1/object/public/branding";

const DEVICE_IMAGES = {
  mac: `${SUPABASE_STORAGE_URL}/macbook-hero.png`,
  windows: `${SUPABASE_STORAGE_URL}/windows-hero.png`,
  iphone: `${SUPABASE_STORAGE_URL}/iphone-hero.png`,
  android: `${SUPABASE_STORAGE_URL}/android-hero.png`,
  ipad: `${SUPABASE_STORAGE_URL}/ipad-hero.png`,
  tablet: `${SUPABASE_STORAGE_URL}/tablet-hero.png`,
} as const;

type DeviceCategory = keyof typeof DEVICE_IMAGES;

const DEVICE_LABELS: Record<DeviceCategory, string> = {
  mac: "Mac",
  windows: "Windows",
  iphone: "iPhone",
  android: "Android",
  ipad: "iPad",
  tablet: "Tablet",
};

const ANIMATION_CATEGORIES: DeviceCategory[] = [
  "android",
  "windows",
  "tablet",
  "iphone",
  "ipad",
  "mac",
];

function getDeviceCategory(
  device: DetectedDevice | null,
): DeviceCategory {
  if (!device) return "tablet";

  const name = device.deviceName.toLowerCase();
  const details = device.deviceDetails.toLowerCase();
  const description = `${name} ${details}`;

  if (/ipad/.test(name)) return "ipad";
  if (/iphone/.test(name)) return "iphone";
  if (/android/.test(name) && /tablet/.test(name)) return "tablet";
  if (/tablet/.test(name)) return "tablet";
  if (/android/.test(name)) return "android";
  if (/\bmac\b|macbook|macos/.test(description)) return "mac";
  if (/windows/.test(description)) return "windows";

  return "tablet";
}

export default function Hero() {
  const [device, setDevice] = useState<DetectedDevice | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);

  const handleDetected = useCallback((detected: DetectedDevice) => {
    setDevice(detected);
  }, []);

  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let interval: number | undefined;

    const startTimeout = window.setTimeout(() => {
      setIsAnimating(true);

      const startTime = Date.now();
      const duration = 3000;

      interval = window.setInterval(() => {
        if (Date.now() - startTime >= duration) {
          if (interval !== undefined) {
            window.clearInterval(interval);
          }

          setIsAnimating(false);
          return;
        }

        setAnimationIndex((current) => current + 1);
      }, 150);
    }, 0);

    return () => {
      window.clearTimeout(startTimeout);

      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
  }, []);

  const detectedCategory = getDeviceCategory(device);

  // Only the text changes during the animation.
  const displayedCategory = isAnimating
    ? ANIMATION_CATEGORIES[
        animationIndex % ANIMATION_CATEGORIES.length
      ]
    : detectedCategory;

  const displayedDeviceName = isAnimating
    ? DEVICE_LABELS[displayedCategory]
    : device?.deviceName ?? "your device";

  // Image selection is based exclusively on the actual detected device.
  const imageCategory = device ? detectedCategory : "tablet";
  const imageSrc = DEVICE_IMAGES[imageCategory];

  const deviceName = device?.deviceName ?? "your device";
  const deviceDetails =
    device?.deviceDetails ?? "Discover what your device can do";

  return (
    <>
      <DeviceDetection onDetected={handleDetected} />

      <section className="overflow-hidden bg-[#fcfbff]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 sm:px-8 lg:min-h-[680px] lg:grid-cols-[0.95fr_1.05fr] lg:gap-8 lg:px-10 lg:py-12">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-violet-600" />
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">
                Every Device Has a Story
              </p>
            </div>

            <h1
              aria-live="polite"
              className="mt-7 text-5xl font-black leading-[0.94] tracking-[-0.065em] text-[#111111] sm:text-6xl lg:text-7xl xl:text-[78px]"
            >
              We found
              <br />
              <span
                key={displayedDeviceName}
                className="inline-block animate-[device-reveal_150ms_ease-out]"
              >
                your {displayedDeviceName}.
              </span>
            </h1>

            <p className="mt-5 text-sm font-semibold text-gray-500 sm:text-base">
              {deviceDetails}
            </p>

            {device?.catalogueMatch?.detected && (
              <div className="mt-4 inline-flex flex-col gap-2 rounded-xl border border-violet-100 bg-white/80 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-gray-800">
                    Matched in Rebox catalogue
                  </span>
                  <span className="text-xs font-semibold text-violet-600">
                    {Math.round(device.catalogueMatch.confidence * 100)}% confidence
                  </span>
                </div>

                {device.catalogueMatch.variant && (
                  <p className="text-xs text-gray-500">
                    {[
                      device.catalogueMatch.variant.model_number,
                      device.catalogueMatch.variant.region,
                      device.catalogueMatch.variant.storage,
                      device.catalogueMatch.variant.connectivity,
                    ].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            )}

            {device?.model && !device?.catalogueMatch?.detected && (
              <p className="mt-3 text-xs font-medium text-amber-700">
                Device model detected, but no catalogue match was found.
              </p>
            )}

            <p className="mt-6 max-w-lg text-base font-medium leading-7 text-gray-600">
              Rebox helps you understand your device, discover what it is
              worth, and see what comes next.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={device?.model
                  ? `/device?model=${encodeURIComponent(device.model)}`
                  : "/device"}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#111111] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-violet-600"
              >
                See Your Device Story
              </Link>

              <Link
                href="/products"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-gray-300 bg-white px-7 py-3.5 text-sm font-semibold text-[#111111] transition-colors hover:border-violet-500"
              >
                Shop Verified Devices
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-gray-400">
              <span>Device Intelligence</span>
              <span>Verified Marketplace</span>
              <span>Smarter Upgrades</span>
            </div>
          </div>

          <div className="relative mx-auto flex min-h-[420px] w-full max-w-[620px] items-center justify-center sm:min-h-[500px] lg:min-h-[580px]">
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-300/30 blur-[85px] sm:h-[430px] sm:w-[430px]"
            />

            <div
              aria-hidden="true"
              className="absolute bottom-[13%] left-[15%] right-[15%] h-10 rounded-full bg-violet-950/10 blur-2xl"
            />

            <div className="relative z-10 flex h-[340px] w-full items-center justify-center sm:h-[440px] lg:h-[510px]">
              <Image
                src={imageSrc}
                alt={`${deviceName} device visual`}
                width={1000}
                height={1000}
                priority
                className="h-full w-full object-contain drop-shadow-[0_28px_40px_rgba(30,20,60,0.14)]"
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 600px"
              />
            </div>

            <div className="absolute right-0 top-3 z-20 sm:right-2 sm:top-6">
              <div className="flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/95 px-4 py-2.5 shadow-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    device ? "bg-emerald-500" : "bg-violet-500"
                  }`}
                />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-700">
                  {device ? "Device Detected" : "Ready to Discover"}
                </span>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 z-20 w-[225px] rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_16px_45px_rgba(20,15,40,0.10)] backdrop-blur-xl sm:bottom-5 sm:left-1 sm:w-[250px] sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                Your Device
              </p>

              <p
                key={displayedDeviceName}
                className="mt-2 text-xl font-black tracking-[-0.04em] text-[#111111] animate-[device-reveal_150ms_ease-out]"
              >
                {displayedDeviceName}
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                {deviceDetails}
              </p>

              <div className="my-3 h-px bg-gray-100" />

              <Link
                href="/device"
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-gray-400">Rebox Intelligence</span>
                <span className="font-bold text-violet-600">
                  Explore <span aria-hidden="true">→</span>
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200/80 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-6 py-8 sm:px-8 md:flex-row md:items-center lg:px-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
                Thinking about an upgrade?
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#111111] sm:text-3xl">
                Your next device might already be here.
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600"
              >
                Explore Verified Devices
              </Link>

              <Link
                href="/trade-in"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-[#111111] transition-colors hover:border-violet-500"
              >
                Upgrade or Swap
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes device-reveal {
          from {
            opacity: 0.45;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-\\[device-reveal_150ms_ease-out\\] {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
