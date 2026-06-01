import Image from "next/image";

export default function Hero() {
  return (
    <section className="bg-[#fcfbff]">

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2">

        {/* LEFT */}
        <div className="max-w-2xl">

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-600">
            Verified Marketplace
          </p>

          <h1 className="mt-6 text-5xl font-black leading-[0.92] tracking-[-0.06em] text-[#111111] md:text-7xl">
            Buy Verified Devices With Confidence.
          </h1>

          <p className="mt-8 text-xl leading-relaxed text-gray-600">
            Rebox helps you discover premium pre-owned devices verified through
            transparent grading, battery health certification, and seller accountability.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <button className="rounded-2xl bg-black px-8 py-5 text-[16px] font-semibold text-white">
              Shop Devices
            </button>

            <button className="rounded-2xl border border-gray-300 bg-white px-8 py-5 text-[16px] font-semibold text-[#111111]">
              Sell Your Device
            </button>

          </div>

        </div>

        {/* RIGHT */}
        <div className="relative hidden lg:flex items-center justify-center">

  {/* BACK BLUR */}
  <div className="absolute h-[520px] w-[520px] rounded-full bg-violet-400/30 blur-3xl" />

  {/* SHADOW UNDER */}
  <div className="absolute bottom-8 h-16 w-[420px] rounded-full bg-violet-900/20 blur-2xl" />

  <Image
    src="/images/branding/hero-img.png"
    alt="Hero"
    width={700}
    height={700}
    priority
    className="relative z-10 h-auto w-full max-w-[680px] object-contain drop-shadow-[0_30px_60px_rgba(124,58,237,0.22)]"
  />

</div>

      </div>

    </section>
  );
}