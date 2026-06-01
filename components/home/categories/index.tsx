import CategoryCard from "@/components/product/category-card";
import { categories } from "@/data/categories";

export default function CategorySection() {
  return (
    <section className="px-6 py-14 lg:px-12">

      <div className="mx-auto max-w-7xl">

        <div className="max-w-2xl">

          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">
            Marketplace
          </p>

          <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#111111]">
            Shop Verified Categories
          </h2>

          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            Explore devices verified through Rebox Verify with
            transparent grading and battery health certification.
          </p>

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