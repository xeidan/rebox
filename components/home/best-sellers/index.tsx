import ProductSlider from "@/components/product/product-slider";
import { supabase } from "@/lib/supabase";

export default async function BestSellers() {
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("featured", true)
    .limit(8);

  const { data: variants } = await supabase
    .from("product_variants")
    .select("*");

  const productsWithVariants =
    products?.map((product) => ({
      ...product,
      product_variants:
        variants?.filter(
          (variant) =>
            Number(variant.product_id) ===
            Number(product.id)
        ) || [],
    })) || [];

  return (
    <section className="px-6 py-16 mx-auto">
      <div className="mx-auto px-6 max-w-7xl">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">
            Best Sellers
          </p>

          <h2 className="mt-3 text-[24px] font-bold tracking-[-0.05em] text-[#111111]">
            Shop our best sellers
          </h2>
        </div>

        <ProductSlider
          products={productsWithVariants}
        />
      </div>
    </section>
  );
}