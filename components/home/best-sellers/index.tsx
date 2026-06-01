import ProductGrid from "@/components/product/product-grid";
import { supabase } from "@/lib/supabase";

export default async function BestSellers() {
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("featured", true)
    .limit(8);

  return (
    <section className="px-6 py-16 lg:px-12">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">
              Best Sellers
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#111111]">
              Shop Our Best Sellers
            </h2>

          </div>

          {/* DESKTOP NAV BUTTONS */}
          <div className="hidden items-center gap-3 md:flex">

            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white transition hover:opacity-80">
              ←
            </button>

            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white transition hover:opacity-80">
              →
            </button>

          </div>

        </div>

        {/* PRODUCTS */}
        <div className="mt-10">

          <ProductGrid products={products || []} />

        </div>

      </div>

    </section>
  );
}