
export type ProductVariant = {
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
};

export type Product = {
  id: number;
  title: string;
  slug: string;
  brand: string;
  ram: string;
  processor: string;
  screen_size: string;
  operating_system: string;
  warranty_months: number;
  original_price: number;
  rating: number;
  review_count: number;
  gallery: string[];
  product_variants: ProductVariant[];
};
