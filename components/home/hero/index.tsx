import Image from "next/image";
import Link from "next/link";

type HeroProps = {
  deviceName?: string;
  deviceDetails?: string;
  deviceImage?: string;
};

export default function Hero({
  deviceName = "iPhone 15 Pro",
  deviceDetails = "256GB · iOS · Apple",
  deviceImage = "https://dahlqmbcazlotvybyykx.supabase.co/storage/v1/object/public/branding/hero-img.png",
}: HeroProps) {
  return (
    <section className="overflow-hidden bg-[#fcfbff]">
      <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-4 lg:px-10 lg:py-20">

        {/* LEFT */}
        <div className="relative z-10 max-w-2xl">

          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-violet-600" />

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-600">
              Every Device Has a Story
            </p>
          </div>

          <h1 className="mt-7 text-5xl font-black leading-[0.9] tracking-[-0.065em] text-[#111111] sm:text-6xl lg:text-7xl xl:text-[82px]">
            We found
            <br />
            your {deviceName}.
          </h1>

          <p className="mt-6 text-base font-semibold text-gray-500">
            {deviceDetails}
          </p>

          <p className="mt-7 max-w-lg text-[16px] font-medium leading-7 text-gray-600">
            Rebox helps you understand your device, discover what it is worth,
            and see what comes next.
          </p>

          {/* ACTIONS */}
          <div className="mt-9 flex flex-wrap gap-3">

            <Link
              href="/device"
              className="rounded-full bg-[#111111] px-7 py-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-violet-600"
            >
              See Your Device Story
            </Link>

            <Link
              href="/products"
              className="rounded-full border border-gray-300 bg-white px-7 py-4 text-sm font-semibold text-[#111111] transition-all duration-300 hover:border-[#111111]"
            >
              Shop Verified Devices
            </Link>

          </div>

          {/* SMALL TRUST POINTS */}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-gray-400">
            <span>Device Intelligence</span>
            <span>Verified Marketplace</span>
            <span>Smarter Upgrades</span>
          </div>

        </div>

        {/* RIGHT */}
        <div className="relative flex min-h-[560px] items-center justify-center lg:min-h-[650px]">

          {/* MAIN GLOW */}
          <div className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/25 blur-3xl sm:h-[520px] sm:w-[520px]" />

          {/* SECONDARY GLOW */}
          <div className="absolute left-1/2 top-[52%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-300/20 blur-2xl" />

          {/* DEVICE */}
          <Image
            src={deviceImage}
            alt={deviceName}
            width={750}
            height={750}
            priority
            className="relative z-10 h-auto w-[90%] max-w-[650px] object-contain drop-shadow-[0_35px_70px_rgba(88,28,135,0.20)]"
          />

          {/* DEVICE DETECTED BADGE */}
          <div className="absolute right-[4%] top-[13%] z-20 rounded-full border border-gray-200 bg-white/90 px-5 py-2.5 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />

              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]">
                Device Detected
              </span>
            </div>
          </div>

          {/* DEVICE INFO CARD */}
          <div className="absolute bottom-[8%] left-[3%] z-20 w-[230px] rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:w-[250px]">

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Your Device
            </p>

            <p className="mt-2 text-xl font-black tracking-[-0.04em] text-[#111111]">
              {deviceName}
            </p>

            <p className="mt-1 text-xs font-medium text-gray-500">
              {deviceDetails}
            </p>

            <div className="mt-4 h-px bg-gray-100" />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Rebox Intelligence
              </span>

              <span className="text-xs font-bold text-violet-600">
                Explore →
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* MARKETPLACE / UPGRADE STRIP */}
      <div className="border-t border-gray-200 bg-white">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-6 py-8 sm:px-8 md:flex-row md:items-center lg:px-10">

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
              className="rounded-full bg-[#111111] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-600"
            >
              Explore Verified Devices
            </Link>

            <Link
              href="/trade-in"
              className="rounded-full border border-gray-300 bg-white px-6 py-3.5 text-sm font-semibold text-[#111111] transition hover:border-[#111111]"
            >
              Upgrade or Swap
            </Link>

          </div>

        </div>

      </div>
    </section>
  );
}