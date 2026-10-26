import ProductCard from "./product-card";

type ProductVariant = {
  id: number;
  product_id: number;
  colour: string;
  storage: string;
  battery_health: number;
  price: number;
  stock: number;
  image: string;
  condition: string;
  inspection_score: number;
  is_default: boolean;
  colour_hex: string;
  sku: string;
};

type Product = {
  id: number;
  title: string;
  slug: string;
  brand: string;

  ram: string | null;
  processor: string | null;
  screen_size: string | null;
  operating_system: string | null;

  warranty_months: number | null;
  original_price: number | null;

  rating: number;
  review_count: number;

  gallery: string[];

  product_variants: ProductVariant[];
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