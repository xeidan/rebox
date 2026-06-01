"use client";

import { useState } from "react";
import Image from "next/image";

const bestDeals = [
  {
    title: "Price drop",
    image: "/images/best-deals/best-deals-price-drop.avif",
  },
  {
    title: "MacBook",
    image: "/images/best-deals/best-deals-macbook-category.avif",
  },
  {
    title: "iPad",
    image: "/images/best-deals/best-deals-ipad-category.avif",
  },
  {
    title: "Android",
    image: "/images/best-deals/best-deals-android-category.avif",
  },
  {
    title: "iPhone",
    image: "/images/best-deals/best-deals-iphone-category.avif",
  },
  {
    title: "AirPods",
    image: "/images/best-deals/best-deals-airpods-category.avif",
  },
  {
    title: "Gaming",
    image: "/images/best-deals/best-deals-gaming-category.avif",
  },
];

export default function DealCategories() {
  const [activeCategory, setActiveCategory] = useState("Price drop");

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 pb-2">
        {bestDeals.map((category) => (
          <button
            key={category.title}
            onClick={() => setActiveCategory(category.title)}
            className={`flex w-[86px] shrink-0 flex-col items-center rounded-2xl border bg-white px-3 py-1 transition-all ${
              activeCategory === category.title
                ? "border-violet-500"
                : "border-transparent"
            }`}
          >
            <Image
              src={category.image}
              alt={category.title}
              width={42}
              height={42}
              className="shrink-0 object-contain"
            />

            <p className="mt-1 text-center text-[12px] leading-tight text-[#1d1d1f]">
              {category.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}