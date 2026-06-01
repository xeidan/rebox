import Image from "next/image";

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

export default function BestDealCard({
  product,
}: {
  product: Product;
}) {
  const formattedPrice = Math.floor(product.price).toLocaleString();

  return (
    /* 
      FIXED MOBILE STRUCTURE: 
      - w-[290px] ensures the card is wide and spacious on mobile, matching Screenshot 2026-05-27 at 13.42.08.png
      - lg:w-auto & lg:min-w-[300px] completely preserves your desktop design layout unchanged.
    */
    <div className="w-[290px] shrink-0 rounded-[28px] bg-white p-5 lg:w-auto lg:min-w-[300px]">

      {/* IMAGE */}
      <div className="relative flex h-[190px] items-center justify-center overflow-hidden lg:h-[170px]">
        <Image
          src={product.image}
          alt={product.title}
          width={165}
          height={165}
          priority
          className="object-contain lg:h-[145px] lg:w-[145px]"
        />
      </div>

      {/* COLORS (Carousel Indicator Dots) */}
      <div className="mt-4 flex items-left justify-start gap-2 lg:mt-2 lg:justify-start">
        <div className="h-3.5 w-3.5 rounded-full border border-black bg-black" />
        <div className="h-3.5 w-3.5 rounded-full border border-[#d8e6cf] bg-[#d8e6cf]" />
        <div className="h-3.5 w-3.5 rounded-full border border-[#cfcfcf] bg-[#cfcfcf]" />
        <div className="h-3.5 w-3.5 rounded-full border border-[#d9b8b1] bg-[#d9b8b1]" />
      </div>

      {/* TITLE */}
      <h3 className="mt-4 text-left text-[18px] font-semibold tracking-[-0.03em] text-[#1d1d1f] lg:text-left lg:text-[15px]">
        {product.title}
      </h3>

      {/* RATING */}
      <div className="mt-3 flex items-left justify-start gap-1.5 lg:justify-start">
        <div className="text-[13px] tracking-tight text-black lg:text-[11px]">
          ★★★★☆
        </div>
        <span className="text-[15px] font-medium text-[#1d1d1f] lg:text-[13px]">
          4.4/5
        </span>
        <span className="text-[15px] text-gray-500 lg:text-[13px]">
          (1,743)
        </span>
      </div>

      {/* PRICE LABEL */}
      <p className="mt-5 text-[15px] text-gray-500 lg:mt-4 lg:text-[13px]">
        Starting at
      </p>

      {/* PRICE */}
      <div className="mt-1 flex items-start leading-none">
        <span className="text-[30px] font-bold tracking-[-0.05em] text-[#111111] lg:text-[28px]">
          ₦{formattedPrice}
        </span>
        <span className="pt-[5px] text-[18px] font-bold text-[#111111] lg:pt-[3px] lg:text-[14px]">
          .00
        </span>
      </div>

      {/* OLD PRICE */}
      <p className="mt-2 text-[15px] text-gray-500 line-through lg:mt-1 lg:text-[13px]">
        ₦
        {(product.price * 1.35).toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}
        .99 new
      </p>

    </div>
  );
}