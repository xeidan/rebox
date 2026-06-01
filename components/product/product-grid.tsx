import ProductCard from "./product-card";

type Product = {
  id: number;
  title: string;
  brand: string;
  price: number;
  image: string;
  condition: string;
  battery_health: number;
  storage: string;
};

type ProductGridProps = {
  products: Product[];
};

export default function ProductGrid({
  products,
}: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </div>
  );
}