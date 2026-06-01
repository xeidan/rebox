import Image from "next/image";
import Link from "next/link";

type Category = {
  title: string;
  slug: string;
  image: string;
};

export default function CategoryCard({
  category,
}: {
  category: Category;
}) {
  return (
    <Link
      href={`/products/${category.slug}`}
      className="group block"
    >
      <div className="rounded-[28px] border border-[#e9d8fd] bg-[#fafafa] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">

        {/* IMAGE */}
        <div className="relative flex h-[120px] items-center justify-center overflow-hidden rounded-2xl">

          <Image
            src={category.image}
            alt={category.title}
            fill
            priority
            className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          />

        </div>

        {/* TITLE */}
        <h3 className="mt-6 p-2 text-center text-[18px] font-bold tracking-[-0.03em] text-[#111111]">
          {category.title}
        </h3>

      </div>
    </Link>
  );
}