import Image from "next/image";
import type { Product } from "@/types/product";

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
};


const colourMap: Record<string, string> = {
  Black: "#111111",
  "Black Titanium": "#1f1f1f",
  White: "#f5f5f5",
  "White Titanium": "#e8e8e8",
  Silver: "#cfcfcf",
  Gold: "#d4b06a",
  Blue: "#6f8db5",
  "Blue Titanium": "#6f8db5",
  Green: "#c7d7c1",
  Purple: "#b9a5d6",
  Pink: "#d9b8b1",
  "Natural Titanium": "#d4cdc1",
};

export default function BestDealCard({
  product,
}: {
  product: Product;
}) {
  const defaultVariant = product.product_variants?.[0];

  if (!defaultVariant) {
    return null;
  }

  const formattedPrice = Math.floor(
    defaultVariant.price || 0
  ).toLocaleString();

  const stars = "★".repeat(
    Math.floor(product.rating || 0)
  );

  const emptyStars = "☆".repeat(
    5 - Math.floor(product.rating || 0)
  );

  const uniqueColours = [
    ...new Set(
      product.product_variants.map(
        (variant) => variant.colour
      )
    ),
  ];

  return (
    <div className="w-[280px] shrink-0 rounded-[28px] bg-white p-5">
      {/* IMAGE */}
      <div className="relative flex h-[190px] items-center justify-center overflow-hidden">
        <Image
          src={defaultVariant.image}
          alt={product.title}
          width={145}
          height={145}
          priority
          className="object-contain"
        />
      </div>

      {/* COLOURS */}
      <div className="mt-4 flex justify-center gap-2">
        {uniqueColours.slice(0, 4).map((colour) => (
          <div
            key={colour}
            className="h-3 w-3 rounded-full border"
            style={{
              backgroundColor:
                colourMap[colour] || "#cccccc",
              borderColor:
                colourMap[colour] || "#cccccc",
            }}
            title={colour}
          />
        ))}
      </div>

      {/* TITLE */}
      <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
        {product.title}
      </h3>

      {/* RATING */}
      <div className="mt-3 flex items-center gap-1.5">
        <div className="text-[10px] tracking-tight text-black">
          {stars}
          {emptyStars}
        </div>

        <span className="text-[10px] font-medium text-[#1d1d1f]">
          {product.rating || 0}/5
        </span>

        <span className="text-[10px] text-gray-500">
          ({(product.review_count || 0).toLocaleString()})
        </span>
      </div>

      {/* PRICE LABEL */}
      <p className="mt-3 text-[10px] font-medium text-gray-500">
        Starting at
      </p>

      {/* PRICE */}
      <div className="mt-1 flex items-start leading-none">
        <span className="text-[18px] font-bold tracking-[-0.05em] text-[#111111]">
          ₦{formattedPrice}
        </span>
      </div>

      {/* ORIGINAL PRICE */}
      <p className="mt-2 text-[13px] text-gray-500 line-through">
        ₦
        {Math.floor(
          product.original_price || 0
        ).toLocaleString()}
      </p>

    </div>
  );
}