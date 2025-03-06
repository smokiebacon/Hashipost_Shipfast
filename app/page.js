import Link from "next/link";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CTA from "@/components/CTA";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import FeaturesGrid from "@/components/FeaturesGrid";
import Testimonials3 from "@/components/Testimonials3";
export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <FeaturesGrid />
        <Testimonials3 />
        <Pricing />
        <FAQ />
        <CTA />
        <Footer />
      </main>
    </>
  );
}
