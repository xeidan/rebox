export default function TrustBanner() {
  const features = [
    {
      title: "Battery Verified",
      desc: "Transparent battery health checks on all supported devices.",
    },
    {
      title: "IMEI Checked",
      desc: "Every device passes blacklist and ownership verification.",
    },
    {
      title: "Trusted Sellers",
      desc: "Seller performance and quality are continuously monitored.",
    },
  ];

  return (
    <section className="px-6 py-20 lg:px-12">

      <div className="mx-auto max-w-7xl rounded-[40px] bg-[#111111] px-8 py-14 text-white lg:px-14">

        <div className="max-w-3xl">

          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
            Why Rebox
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-[-0.05em]">
            Marketplace Trust Built Into Every Purchase
          </h2>

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

      </div>

    </section>
  );
}