import BestDealCard from "./best-deal-card";

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

export default function DealSlider({
  products,
}: {
  products: Product[];
}) {
  return (
    <div className="mt-6 overflow-x-scroll scrollbar-hide [-webkit-overflow-scrolling:touch]">

      <div className="flex flex-nowrap gap-4">

        {products.map((product) => (
          <BestDealCard
            key={product.id}
            product={product}
          />
        ))}

      </div>

    </div>
  );
}