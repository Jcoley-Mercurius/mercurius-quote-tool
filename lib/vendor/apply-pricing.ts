import type { GeneratedQuotePayload } from "@/lib/quote/schema";
import type { VendorPricingSettings } from "./types";

function roundPrice(n: number): number {
  return Math.round(n / 5) * 5;
}

function applySpread(recommended: number, spread: number) {
  const factor = spread / 100;
  return {
    low: roundPrice(recommended * (1 - factor)),
    high: roundPrice(recommended * (1 + factor)),
  };
}

function isLaborItem(category: string, unit: string): boolean {
  const cat = category.toLowerCase();
  const u = unit.toLowerCase();
  return cat === "labor" || u === "hour" || u === "hours" || u === "hr";
}

function isMaterialItem(category: string): boolean {
  const cat = category.toLowerCase();
  return cat === "materials" || cat === "equipment";
}

export function applyVendorPricing(
  quote: GeneratedQuotePayload,
  vendor: VendorPricingSettings
): GeneratedQuotePayload {
  let lineItems = quote.lineItems.map((item) => {
    let recommended = item.priceRecommended;

    if (isLaborItem(item.category, item.unit) && item.quantity > 0) {
      recommended = roundPrice(vendor.laborRatePerHour * item.quantity);
    } else if (isMaterialItem(item.category)) {
      const withMaterialMarkup =
        item.priceRecommended * (1 + vendor.materialMarkupPercentage / 100);
      recommended = roundPrice(
        withMaterialMarkup * (1 + vendor.markupPercentage / 100)
      );
    } else if (item.category.toLowerCase() !== "permit") {
      recommended = roundPrice(
        item.priceRecommended * (1 + vendor.markupPercentage / 100)
      );
    }

    const { low, high } = applySpread(recommended, vendor.priceRangeSpread);
    return {
      ...item,
      priceRecommended: recommended,
      priceLow: low,
      priceHigh: high,
    };
  });

  if (vendor.includeTravelFee) {
    const hasTravel = lineItems.some((i) =>
      i.description.toLowerCase().includes("travel")
    );
    if (!hasTravel) {
      const travelRec = vendor.travelFee;
      const { low, high } = applySpread(travelRec, vendor.priceRangeSpread);
      lineItems = [
        {
          category: "Other",
          description: "Travel & service call fee",
          quantity: 1,
          unit: "visit",
          priceLow: low,
          priceRecommended: travelRec,
          priceHigh: high,
        },
        ...lineItems,
      ];
    }
  }

  const recommendedTotal = lineItems.reduce(
    (sum, i) => sum + i.priceRecommended,
    0
  );

  if (recommendedTotal < vendor.minimumJobValue) {
    const shortfall = vendor.minimumJobValue - recommendedTotal;
    const { low, high } = applySpread(shortfall, vendor.priceRangeSpread);
    lineItems.push({
      category: "Other",
      description: "Minimum service charge adjustment",
      quantity: 1,
      unit: "each",
      priceLow: low,
      priceRecommended: roundPrice(shortfall),
      priceHigh: high,
    });
  }

  const assumptions = [...quote.assumptions];
  if (vendor.businessName) {
    assumptions.unshift(
      `Pricing based on ${vendor.businessName} standard rates ($${vendor.laborRatePerHour}/hr labor, ${vendor.markupPercentage}% markup)`
    );
  }
  if (vendor.minimumJobValue > 0) {
    assumptions.push(`Minimum job value of $${vendor.minimumJobValue} applied`);
  }

  return {
    ...quote,
    lineItems,
    assumptions,
    validityDays: vendor.quoteValidityDays,
  };
}