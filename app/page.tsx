import { HowMercuriusWorks } from "@/components/landing/HowMercuriusWorks";
import { MercuriusFeaturesGrid } from "@/components/landing/MercuriusFeaturesGrid";
import { MercuriusHero } from "@/components/landing/MercuriusHero";

export default function Home() {
  return (
    // Pull the landing sections flush to the edges of the padded app shell so
    // their full-width backgrounds read as a proper landing page.
    <div className="-mx-4 -mt-8 -mb-8 sm:-mx-6 sm:-mt-12 sm:-mb-12">
      <MercuriusHero getQuoteHref="/request-repair" vendorsHref="/settings" />
      <HowMercuriusWorks />
      <MercuriusFeaturesGrid />
    </div>
  );
}
