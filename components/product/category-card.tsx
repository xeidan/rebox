
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
      aria-label={`Explore ${category.title}`}
      className="group block h-full rounded-[24px] outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-4"
    >
      <article
        className="
          relative flex h-full min-h-[248px] flex-col
          overflow-hidden rounded-[24px]
          border border-[#E9DDFB]
          bg-white
          transition-all duration-300 ease-out
          hover:-translate-y-1
          hover:border-[#CDB4F6]
          hover:shadow-[0_16px_40px_rgba(91,33,182,0.09)]
          sm:min-h-[270px]
        "
      >
        {/* Subtle hover accent */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none absolute inset-x-8 top-0 h-px
            bg-gradient-to-r from-transparent via-[#C4A1FF] to-transparent
            opacity-0 transition-opacity duration-300
            group-hover:opacity-100
          "
        />

        {/* Product image */}
        <div className="relative mx-4 mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-[18px] bg-[#FCFBFE] sm:mx-5 sm:mt-5">
          <div className="relative h-[150px] w-full transition-transform duration-500 ease-out group-hover:scale-[1.06] sm:h-[168px]">
            <Image
              src={category.image}
              alt={category.title}
              fill
              sizes="(max-width: 640px) 42vw, (max-width: 1024px) 28vw, 260px"
              className="object-contain p-2"
            />
          </div>
        </div>

        {/* Category label */}
        <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <h3 className="text-[15px] font-semibold tracking-[-0.035em] text-[#17151C] transition-colors duration-300 group-hover:text-[#7138C8] sm:text-[17px]">
            {category.title}
          </h3>

          <span
            aria-hidden="true"
            className="
              flex h-8 w-8 shrink-0 items-center justify-center
              rounded-full border border-[#EDE5F8]
              text-[#82758F]
              transition-all duration-300
              group-hover:border-[#DCC8FA]
              group-hover:bg-[#F5EEFF]
              group-hover:text-[#7138C8]
            "
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            >
              <path
                d="M4.5 10h11m-4.5-4.5L15.5 10 11 14.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </article>
    </Link>
  );
}
