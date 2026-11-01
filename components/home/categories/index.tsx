
import CategoryCard from "@/components/product/category-card";
import { categories } from "@/data/categories";

export default function CategorySection() {
  return (
    <section className="mx-auto px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">
            Categories
          </p>

          <h2 className="mt-3 text-[24px] font-bold tracking-[-0.05em] text-[#111111] sm:text-3xl">
            Shop verified categories
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
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
