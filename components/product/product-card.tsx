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

export default function ProductCard({
  product,
}: {
  product: Product;
}) {
  const formattedPrice = Math.floor(product.price).toLocaleString();

  return (
    <div className="group w-full cursor-pointer rounded-2xl border border-[#ebebeb] bg-white p-4 transition-all duration-200 hover:shadow-sm">

      {/* MOBILE LAYOUT */}
      <div className="flex items-start gap-4 sm:hidden">

        {/* IMAGE */}
        <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-xl bg-white">

          <Image
            src={product.image}
            alt={product.title}
            fill
            priority
            className="object-contain p-2"
          />

        </div>

        {/* INFO */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* COLOR DOTS */}
          <div className="flex items-center gap-1">

            <div className="h-3 w-3 rounded-full bg-black" />
            <div className="h-3 w-3 rounded-full bg-zinc-500" />
            <div className="h-3 w-3 rounded-full bg-stone-300" />

            <span className="ml-1 text-[12px] text-gray-500">
              +1
            </span>

          </div>

          {/* TITLE */}
          <h3 className="mt-3 line-clamp-2 text-[18px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
            {product.title}
          </h3>

          {/* RATING */}
          <div className="mt-2 flex items-center gap-1">

            <div className="text-[11px] tracking-tight text-black">
              ★★★★★
            </div>

            <span className="text-[12px] font-medium text-[#1d1d1f]">
              4.4/5
            </span>

            <span className="text-[12px] text-gray-500">
              (17,445)
            </span>

          </div>

          {/* PRICE */}
          <p className="mt-3 text-[12px] text-gray-500">
            Starting at
          </p>

          <div className="mt-1 flex items-start leading-none">

            <span className="text-[24px] font-bold tracking-[-0.05em] text-[#1d1d1f]">
              ₦{formattedPrice}
            </span>

            <span className="pt-[3px] text-[12px] font-bold text-[#1d1d1f]">
              .00
            </span>

          </div>

          <p className="mt-1 text-[13px] text-gray-500 line-through">
            ₦
            {(product.price * 1.35).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
            .00 new
          </p>

        </div>

      </div>

      {/* DESKTOP + TABLET LAYOUT */}
      <div className="hidden sm:block">

        {/* IMAGE */}
        <div className="relative flex h-[180px] items-center justify-center overflow-hidden">

          <Image
            src={product.image}
            alt={product.title}
            width={160}
            height={160}
            priority
            className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          />

        </div>

        {/* COLOR DOTS */}
        <div className="mt-2 flex items-center gap-1">

          <div className="h-3 w-3 rounded-full bg-black" />
          <div className="h-3 w-3 rounded-full bg-zinc-500" />
          <div className="h-3 w-3 rounded-full bg-stone-300" />

          <span className="ml-1 text-[12px] text-gray-500">
            +1
          </span>

        </div>

        {/* TITLE */}
        <h3 className="mt-4 line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-[-0.03em] text-[#1d1d1f]">
          {product.title}
        </h3>

        {/* RATING */}
        <div className="mt-2 flex items-center gap-1">

          <div className="text-[11px] tracking-tight text-black">
            ★★★★★
          </div>

          <span className="text-[12px] font-medium text-[#1d1d1f]">
            4.4/5
          </span>

          <span className="text-[12px] text-gray-500">
            (17,445)
          </span>

        </div>

        {/* PRICE */}
        <p className="mt-3 text-[12px] text-gray-500">
          Starting at
        </p>

        <div className="mt-1 flex items-start leading-none">

          <span className="text-[24px] font-bold tracking-[-0.05em] text-[#1d1d1f]">
            ₦{formattedPrice}
          </span>

          <span className="pt-[4px] text-[12px] font-bold text-[#1d1d1f]">
            .00
          </span>

        </div>

        <p className="mt-1 text-[13px] text-gray-500 line-through">
          ₦
          {(product.price * 1.35).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}
          .00 new
        </p>

      </div>

    </div>
  );
}