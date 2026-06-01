import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

import Hero from "@/components/home/hero";
import CategorySection from "@/components/home/categories";
import BestDeals from "@/components/home/best-deals";
import BestSellers from "@/components/home/best-sellers";
import TrustBanner from "@/components/home/trust-banner";
import ReviewsSection from "@/components/home/reviews";
import FaqSection from "@/components/home/faq";
import Newsletter from "@/components/home/newsletter";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f4ff]">
      <Navbar />

      <Hero />

      <CategorySection />

      <BestDeals />

      <BestSellers />

      <TrustBanner />

      <ReviewsSection />

      <FaqSection />

      <Newsletter />

      <Footer />
    </main>
  );
}