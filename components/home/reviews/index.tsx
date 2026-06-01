export default function ReviewsSection() {
  const reviews = [
    {
      name: "Tobi",
      location: "Lagos",
      review:
        "Bought an iPhone 13 from Rebox and honestly expected issues. Phone came clean, battery health was solid, and delivery was fast.",
    },

    {
      name: "Amaka",
      location: "Abuja",
      review:
        "I saved over ₦300k compared to buying new. Device looked almost untouched and everything worked perfectly.",
    },

    {
      name: "David",
      location: "Port Harcourt",
      review:
        "Finally found a trusted place for pre-owned devices in Nigeria. Transparent process and no weird surprises.",
    },
  ];

  return (
    <section className="px-6 py-20 lg:px-12">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="max-w-2xl">

          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">
            Reviews
          </p>

          <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#111111] lg:text-5xl">
            What People Are Saying
          </h2>

          <p className="mt-5 text-lg leading-relaxed text-[#5f6470]">
            Thousands of Nigerians are switching to verified pre-owned
            devices without paying flagship prices.
          </p>

        </div>

        {/* REVIEWS GRID */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {reviews.map((review, index) => (
            <div
              key={index}
              className="rounded-[32px] border border-[#ebe7ff] bg-white p-8"
            >

              {/* STARS */}
              <div className="text-[18px] tracking-tight text-black">
                ★★★★★
              </div>

              {/* REVIEW */}
              <p className="mt-6 text-[17px] leading-[1.8] text-[#3e4450]">
                “{review.review}”
              </p>

              {/* USER */}
              <div className="mt-8">

                <p className="text-[16px] font-semibold text-[#111111]">
                  {review.name}
                </p>

                <p className="mt-1 text-sm text-[#6b7280]">
                  {review.location}, Nigeria
                </p>

              </div>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}