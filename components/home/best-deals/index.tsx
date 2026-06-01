import Image from "next/image";
import { supabase } from "@/lib/supabase";
import DealSlider from "./deal-slider";
import DealCategories from "./deal-categories";

export default async function BestDeals() {
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("featured", true)
    .limit(8);

  return (
    <section className="px-6 py-16 lg:px-12">

      <div className="mx-auto max-w-7xl">

        {/* TITLE */}
        <h2 className="text-[34px] font-black tracking-[-0.05em] text-[#111111]">
          Shop our best deals
        </h2>

        {/* SHOWCASE */}
        <div className="mt-8 overflow-hidden rounded-[36px] bg-[#f1f1f1]">

          <div className="flex flex-col lg:flex-row">

            {/* LEFT IMAGE */}
            <div className="relative h-[160px] w-full sm:h-[200px] lg:h-auto lg:w-[34%]">

              <Image
                src="/images/best-deals/best-deals-banner.avif"
                alt="Best deals"
                fill
                priority
                className="object-cover"
              />

            </div>

            {/* RIGHT CONTENT */}
            <div className="flex-1 p-5 lg:p-6">

              <DealCategories />

              {/* PRODUCTS PLACEHOLDER */}
              <div className="mt-6 flex gap-5 overflow-x-auto">

                <DealSlider products={products || []} />

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
