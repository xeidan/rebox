"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

type ProductSliderProps = {
  products: Product[];
};

export default function ProductSlider({
  products,
}: ProductSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    sliderRef.current?.scrollBy({
      left: -1200,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    sliderRef.current?.scrollBy({
      left: 1200,
      behavior: "smooth",
    });
  };

  return (
    <>
      {/* ARROWS */}
      <div className="mb-8 flex justify-end gap-3">
        <button
          onClick={scrollLeft}
          aria-label="Previous products"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e5e5e5] text-[#666] transition hover:bg-[#dcdcdc]"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          onClick={scrollRight}
          aria-label="Next products"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white transition hover:opacity-90"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* SLIDER */}
      <div
        ref={sliderRef}
        className="flex gap-5 overflow-x-auto scroll-smooth scrollbar-hide"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[320px] shrink-0"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </>
  );
}