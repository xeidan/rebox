import Image from "next/image";
import { supabase } from "@/lib/supabase";
import DealSlider from "./deal-slider";
import DealCategories from "./deal-categories";

export default async function BestDeals() {
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("featured", true)
    .limit(8);

  if (productsError) {
  throw new Error(
    `Products query failed: ${JSON.stringify({
      message: productsError.message,
      details: productsError.details,
      hint: productsError.hint,
      code: productsError.code,
    })}`
  );
}

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("*");

  if (variantsError) {
    console.error("BestDeals - variants query failed:", {
      message: variantsError.message,
      details: variantsError.details,
      hint: variantsError.hint,
      code: variantsError.code,
    });

    return null;
  }

  const productsWithVariants =
    products?.map((product) => {
      const productVariants =
        variants?.filter(
          (variant) =>
            Number(variant.product_id) === Number(product.id)
        ) ?? [];

      const defaultVariant =
        productVariants.find((variant) => variant.is_default) ??
        productVariants[0];

      return {
        ...product,
        image: defaultVariant?.image ?? null,
        price: defaultVariant?.price ?? 0,
        product_variants: productVariants,
      };
    }) ?? [];

  return (
    <section className="mx-auto px-6 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">
          Best Deals
        </p>

        <h2 className="mt-3 text-[24px] font-bold tracking-[-0.05em] text-[#111111]">
          Shop our best deals
        </h2>

        <div className="mt-8 overflow-hidden rounded-[36px] bg-violet-100">
          <div className="grid lg:grid-cols-[340px_1fr]">
            <div className="relative self-stretch">
              <Image
                src="https://dahlqmbcazlotvybyykx.supabase.co/storage/v1/object/public/banners/best-deals-banner.avif"
                alt="Best deals"
                fill
                priority
                sizes="(max-width:1024px) 100vw, 340px"
                className="object-cover"
              />

              <div className="h-[180px] lg:hidden" />
            </div>

            <div className="min-w-0 p-4 lg:p-6">
              <DealCategories />

              <div className="mt-6">
                <DealSlider products={productsWithVariants} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}