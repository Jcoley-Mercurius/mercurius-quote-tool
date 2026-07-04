import { getSwflAreaName } from "@/lib/swfl";
import type { ServiceType } from "@/components/quote-form/types";
import { SERVICE_OPTIONS } from "@/components/quote-form/types";
import { DEFAULT_VENDOR_PROFILE } from "@/lib/vendor/defaults";
import type { VendorPricingSettings } from "@/lib/vendor/types";
import { toPricingSettings } from "@/lib/vendor/types";
import type { GeneratedQuotePayload } from "./schema";
import type { QuoteFormPayload } from "./types";

/** Rule-based fallback when no AI API key is configured */
export function generateFallbackQuote(
  form: QuoteFormPayload,
  vendor?: VendorPricingSettings
): GeneratedQuotePayload {
  const v = vendor ?? toPricingSettings(DEFAULT_VENDOR_PROFILE);
  const sqft = Number(form.squareFootage);
  const year = Number(form.yearBuilt);
  const age = new Date().getFullYear() - year;
  const area = getSwflAreaName(form.zipCode) ?? "Southwest Florida";
  const serviceLabel =
    SERVICE_OPTIONS.find((s) => s.id === form.serviceType)?.label ?? "General";

  const storiesLabel =
    form.stories === "3+" ? "3+ story" : `${form.stories}-story`;

  const propertyContext = `Based on a ${sqft.toLocaleString()} sq ft, ${storiesLabel} home built in ${year} in ${area.split(" (")[0]}`;

  const lineItems = getServiceLineItems(form.serviceType, sqft, age);
  const alerts = getServiceAlerts(form.serviceType, year, age, form.zipCode);

  return {
    title: v.businessName
      ? `${serviceLabel} Quote — ${v.businessName}`
      : `${serviceLabel} Service Quote`,
    propertyContext,
    lineItems,
    assumptions: [
      "Quote assumes standard site access and working hours (Mon–Fri, 8am–5pm)",
      "Pricing includes Lee County area labor rates; permit fees estimated separately where noted",
      age > 30
        ? "Assumes typical conditions for a home of this age — hidden issues may require change order"
        : "Assumes code-compliant existing infrastructure unless otherwise noted",
      "Quote valid for 30 days; material costs subject to supplier pricing at time of purchase",
    ],
    notes: [
      "All work performed by licensed and insured contractors per Florida requirements",
      "Final pricing confirmed after on-site inspection",
      form.photoCount > 0
        ? `${form.photoCount} site photo(s) reviewed for initial scope assessment`
        : "Recommend on-site visit to verify scope before final commitment",
    ],
    alerts,
    validityDays: v.quoteValidityDays,
  };
}

function getServiceLineItems(
  service: ServiceType,
  sqft: number,
  age: number
): GeneratedQuotePayload["lineItems"] {
  const ageMultiplier = age > 35 ? 1.15 : age > 25 ? 1.08 : 1;
  const sizeMultiplier = sqft > 2500 ? 1.12 : sqft < 1500 ? 0.92 : 1;
  const m = ageMultiplier * sizeMultiplier;

  const templates: Record<ServiceType, GeneratedQuotePayload["lineItems"]> = {
    hvac: [
      { category: "Labor", description: "HVAC system removal and installation labor", quantity: 8, unit: "hours", priceLow: Math.round(760 * m), priceRecommended: Math.round(960 * m), priceHigh: Math.round(1200 * m) },
      { category: "Equipment", description: "3-ton 16 SEER2 heat pump system with condenser and air handler", quantity: 1, unit: "system", priceLow: Math.round(4200 * m), priceRecommended: Math.round(5500 * m), priceHigh: Math.round(6800 * m) },
      { category: "Materials", description: "Refrigerant lines, electrical whip, hurricane-rated condenser pad and straps", quantity: 1, unit: "kit", priceLow: 350, priceRecommended: 525, priceHigh: 700 },
      { category: "Labor", description: "Ductwork inspection and minor sealing", quantity: 2, unit: "hours", priceLow: 180, priceRecommended: 240, priceHigh: 310 },
      { category: "Permit", description: "Lee County mechanical permit and inspection fees", quantity: 1, unit: "permit", priceLow: 150, priceRecommended: 250, priceHigh: 350 },
    ],
    pool: [
      { category: "Labor", description: "Pool equipment diagnostic and replacement labor", quantity: 4, unit: "hours", priceLow: 300, priceRecommended: 400, priceHigh: 520 },
      { category: "Equipment", description: "Variable-speed pool pump and installation", quantity: 1, unit: "each", priceLow: 650, priceRecommended: 950, priceHigh: 1250 },
      { category: "Materials", description: "PVC plumbing fittings, unions, and electrical connections", quantity: 1, unit: "kit", priceLow: 85, priceRecommended: 150, priceHigh: 225 },
      { category: "Labor", description: "System startup, calibration, and water chemistry balance", quantity: 1, unit: "visit", priceLow: 125, priceRecommended: 175, priceHigh: 250 },
    ],
    plumbing: [
      { category: "Labor", description: "Plumbing diagnostic and repair labor", quantity: 3, unit: "hours", priceLow: 255, priceRecommended: 345, priceHigh: 450 },
      { category: "Materials", description: "Copper/PVC fittings, valves, and supply lines", quantity: 1, unit: "kit", priceLow: 120, priceRecommended: 225, priceHigh: 380 },
      { category: "Equipment", description: "50-gallon electric water heater with expansion tank", quantity: 1, unit: "each", priceLow: 1100, priceRecommended: 1650, priceHigh: 2200 },
      { category: "Permit", description: "Plumbing permit (if required)", quantity: 1, unit: "permit", priceLow: 100, priceRecommended: 175, priceHigh: 250 },
    ],
    roofing: [
      { category: "Labor", description: "Tear-off and shingle installation labor", quantity: Math.round(sqft / 100), unit: "squares", priceLow: Math.round(3200 * m), priceRecommended: Math.round(4800 * m), priceHigh: Math.round(6500 * m) },
      { category: "Materials", description: "Architectural shingles, underlayment, and ridge vents (FBC-rated)", quantity: Math.round(sqft / 100), unit: "squares", priceLow: Math.round(2800 * m), priceRecommended: Math.round(4200 * m), priceHigh: Math.round(5600 * m) },
      { category: "Materials", description: "Drip edge, flashing, and hurricane clips", quantity: 1, unit: "kit", priceLow: 450, priceRecommended: 700, priceHigh: 950 },
      { category: "Permit", description: "Roofing permit and final inspection", quantity: 1, unit: "permit", priceLow: 250, priceRecommended: 375, priceHigh: 500 },
    ],
    electrical: [
      { category: "Labor", description: "Electrical panel assessment and upgrade labor", quantity: 6, unit: "hours", priceLow: 570, priceRecommended: 780, priceHigh: 980 },
      { category: "Equipment", description: "200A main breaker panel with ground rod upgrade", quantity: 1, unit: "each", priceLow: 800, priceRecommended: 1200, priceHigh: 1600 },
      { category: "Materials", description: "Wire, conduit, breakers, and labeling", quantity: 1, unit: "kit", priceLow: 350, priceRecommended: 550, priceHigh: 750 },
      { category: "Permit", description: "Electrical permit and inspection fees", quantity: 1, unit: "permit", priceLow: 100, priceRecommended: 200, priceHigh: 300 },
    ],
    lawn: [
      { category: "Labor", description: "Irrigation system diagnostic and repair", quantity: 3, unit: "hours", priceLow: 135, priceRecommended: 195, priceHigh: 260 },
      { category: "Materials", description: "Sprinkler heads, valves, and PVC pipe (sandy soil rated)", quantity: 1, unit: "kit", priceLow: 150, priceRecommended: 275, priceHigh: 425 },
      { category: "Labor", description: "Zone testing, timer programming, and adjustment", quantity: 1, unit: "visit", priceLow: 75, priceRecommended: 125, priceHigh: 175 },
    ],
    general: [
      { category: "Labor", description: "On-site assessment and general repair labor", quantity: 4, unit: "hours", priceLow: 200, priceRecommended: 320, priceHigh: 440 },
      { category: "Materials", description: "Miscellaneous materials and supplies", quantity: 1, unit: "kit", priceLow: 100, priceRecommended: 200, priceHigh: 350 },
      { category: "Labor", description: "Cleanup and final walkthrough", quantity: 1, unit: "visit", priceLow: 50, priceRecommended: 100, priceHigh: 150 },
    ],
  };

  return templates[service];
}

function getServiceAlerts(
  service: ServiceType,
  year: number,
  age: number,
  zip: string
): GeneratedQuotePayload["alerts"] {
  const alerts: GeneratedQuotePayload["alerts"] = [];

  if (age >= 30) {
    alerts.push({
      type: "warning",
      title: "Older home infrastructure",
      message: `Built in ${year}, this home may have original plumbing, electrical, or HVAC components that don't meet current Florida Building Code. Recommend on-site inspection before finalizing scope.`,
    });
  }

  if (service === "hvac") {
    alerts.push({
      type: "suggestion",
      title: "Humidity & salt air factor",
      message:
        "SWFL's high humidity accelerates coil corrosion. Consider coated coils and a UV light for mold prevention — popular upsell in Cape Coral.",
    });
  }

  if (service === "pool") {
    alerts.push({
      type: "info",
      title: "Pool cage inspection",
      message:
        "With 400+ miles of canals, Cape Coral pool cages often need rescreening. Check for corroded fasteners during this visit — common add-on revenue.",
    });
  }

  if (service === "electrical" && age >= 25) {
    alerts.push({
      type: "warning",
      title: "Panel upgrade likely needed",
      message:
        "Homes from the 1980s–90s commonly have 100A panels. A 200A upgrade ($2,200–$4,500) may be required for modern loads or generator installation.",
    });
  }

  if (service === "roofing") {
    alerts.push({
      type: "warning",
      title: "Hurricane code compliance",
      message:
        "Lee County requires FBC-compliant roofing products. Ensure permit includes wind mitigation documentation — homeowners may qualify for insurance discounts.",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "info",
      title: "Lee County service area",
      message: `Quote calibrated for zip ${zip}. Local permit costs and labor rates applied for the Southwest Florida market.`,
    });
  }

  return alerts;
}