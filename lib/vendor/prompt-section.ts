import type { VendorPricingSettings } from "./types";

export function buildVendorPromptSection(vendor: VendorPricingSettings): string {
  const hasCustomBusiness = vendor.businessName.trim().length > 0;

  return `
## Vendor Pricing Profile — USE THESE RATES (override generic benchmarks)
${hasCustomBusiness ? `**Business:** ${vendor.businessName}` : "**Business:** Vendor (use rates below, not generic Lee County defaults)"}

**Labor Rate:** $${vendor.laborRatePerHour}/hr — use this for ALL labor line items (qty × rate)
**Materials Markup:** ${vendor.materialMarkupPercentage}% on materials and equipment costs (before general markup)
**General Markup:** ${vendor.markupPercentage}% on non-labor items after material markup
**Minimum Job Value:** $${vendor.minimumJobValue} — recommended total MUST be at least this amount
**Price Range Spread:** ±${vendor.priceRangeSpread}% from recommended for low/high estimates
**Quote Validity:** ${vendor.quoteValidityDays} days
${vendor.includeTravelFee ? `**Travel/Service Fee:** $${vendor.travelFee} — include as a separate line item` : ""}

### Pricing Rules for This Vendor
1. Labor line items: calculate as hours × $${vendor.laborRatePerHour}/hr
2. Materials/Equipment: apply ${vendor.materialMarkupPercentage}% material markup, then ${vendor.markupPercentage}% general markup
3. Ensure the recommended grand total is ≥ $${vendor.minimumJobValue}
4. Low estimate = recommended × (1 - ${vendor.priceRangeSpread / 100}), High = recommended × (1 + ${vendor.priceRangeSpread / 100})
5. These vendor rates take priority over Lee County benchmark ranges when they differ`;
}