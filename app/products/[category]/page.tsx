import { supabase } from "@/lib/supabase";
import ProductGrid from "@/components/product/product-grid";

type Props = {
  params: {
    category: string;
  };
};

export default async function CategoryPage({
  params,
}: Props) {

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .ilike("brand", `%${params.category}%`);

  return (
    <main className="min-h-screen bg-white px-6 py-10">

      <div className="mx-auto max-w-7xl">

        <h1 className="text-4xl font-bold tracking-tight text-[#111111] capitalize">
          {params.category}
        </h1>

        <p className="mt-2 text-gray-500">
          Verified devices in this category
        </p>

        <div className="mt-10">

          <ProductGrid
            products={products || []}
          />

        </div>

      </div>

    </main>
  );
}