"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BestDealCard from "./best-deal-card";
import type { Product } from "@/types/product";



export default function DealSlider({
  products,
}: {
  products: Product[];
}) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    sliderRef.current?.scrollBy({
      left: -900,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    sliderRef.current?.scrollBy({
      left: 900,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div
        ref={sliderRef}
        className="w-full min-w-0 overflow-x-auto scrollbar-hide [-webkit-overflow-scrolling:touch]"
      >
        <div className="flex w-max gap-4">
          {products.map((product) => (
            <BestDealCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={scrollLeft}
          aria-label="Previous products"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5e5e5] text-[#666] transition hover:bg-[#dcdcdc]"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          onClick={scrollRight}
          aria-label="Next products"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white transition hover:opacity-90"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </>
  );
}