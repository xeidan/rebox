export default function TrustBanner() {
  const features = [
    {
      title: "IMEI Verification",
      desc: "Check whether a device has been reported lost, stolen, blocked, or blacklisted before making a purchase.",
    },
    {
      title: "Device Authenticity",
      desc: "Verify key device information including model details, activation status, and authenticity indicators.",
    },
    {
      title: "Buy With Confidence",
      desc: "Avoid costly mistakes and reduce marketplace scams with trusted device verification reports.",
    },
  ];

  return (
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[40px] bg-[#111111] px-6 py-14 text-white lg:px-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
              Rebox Verify
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em]">
              Verify Any Device Before You Buy
            </h2>

            <p className="mt-6 text-[15px] leading-relaxed text-gray-400">
              Rebox Verify helps you check a device's IMEI status,
              authenticity, and marketplace risk before sending
              payment or meeting a seller.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title}>
                <h3 className="text-xl font-bold">
                  {feature.title}
                </h3>

                <p className="mt-3 text-[15px] leading-relaxed text-gray-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <button className="rounded-full bg-violet-500 px-8 py-4 text-[15px] font-semibold text-white transition hover:bg-violet-600">
              Verify a Device
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}