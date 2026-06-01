import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/product/product-card";

export default async function Home() {
  const { data: products } = await supabase
    .from("products")
    .select("*");

  return (
    <main className="min-h-screen bg-white p-10">
      
      <h1 className="mb-10 text-4xl font-bold text-black">
        Featured Devices
      </h1>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-4">
  {products?.map((product) => (
    <ProductCard
      key={product.id}
      product={product}
    />
  ))}
</div>
    </main>
  );
}

