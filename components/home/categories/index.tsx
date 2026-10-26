import CategoryCard from "@/components/product/category-card";
import { categories } from "@/data/categories";

export default function CategorySection() {
  return (
    <section className="px-6 py-14 mx-auto">

      <div className="mx-auto max-w-7xl px-6">

        <div className="max-w-2xl">

          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">
            categories
          </p>

          <h2 className="mt-3 text-[24px] font-bold tracking-[-0.05em] text-[#111111]">
            Shop verified categories
          </h2>

        </div>

        <div className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">

          {categories.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
            />
          ))}

        </div>

      </div>

    </section>
  );
}