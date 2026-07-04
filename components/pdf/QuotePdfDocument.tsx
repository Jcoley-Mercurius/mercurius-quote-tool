import {
  Document,
  Image,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatCurrency, formatCurrencyDetailed } from "@/lib/quote/format";
import { computeTotals } from "@/lib/quote/types";
import { getSwflAreaName } from "@/lib/swfl";
import { SERVICE_OPTIONS } from "@/components/quote-form/types";
import { formatQuoteDate } from "@/lib/pdf/reference";
import type { PdfExportData } from "@/lib/pdf/types";
import {
  normalizePhotoVisionAnalysis,
  observationText,
  scopeItemText,
} from "@/lib/quote/vision-compat";
import { colors, pdfStyles as s } from "./pdf-styles";

function unitPrice(total: number, quantity: number): number {
  if (quantity <= 0) return total;
  return total / quantity;
}

export function QuotePdfDocument({ data }: { data: PdfExportData }) {
  const { quote, form, options, vendor, logoUrl, quoteReference } = data;
  const brandName = vendor.businessName || "Mercurius";
  const brandTagline =
    vendor.tagline || "AI Quote Generator · Southwest Florida";
  const totals = computeTotals(quote.lineItems);
  const areaName = getSwflAreaName(form.zipCode);
  const serviceLabel =
    SERVICE_OPTIONS.find((opt) => opt.id === form.serviceType)?.label ??
    "General";
  const storiesLabel =
    form.stories === "3+" ? "3+ Stories" : `${form.stories}-Story`;

  return (
    <Document
      title={`${quote.title} — ${quoteReference}`}
      author={brandName}
      subject="Home Service Quote"
    >
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoSection}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
            <Image src={logoUrl} style={s.logo} />
            <View>
              <Text style={s.brandName}>{brandName}</Text>
              <Text style={s.brandTagline}>{brandTagline}</Text>
              {vendor.phone ? (
                <Text style={{ fontSize: 8, color: colors.slate500, marginTop: 3 }}>
                  {vendor.phone}
                  {vendor.email ? ` · ${vendor.email}` : ""}
                </Text>
              ) : vendor.email ? (
                <Text style={{ fontSize: 8, color: colors.slate500, marginTop: 3 }}>
                  {vendor.email}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Quote Reference</Text>
            <Text style={s.metaValue}>{quoteReference}</Text>
            <Text style={s.metaLabel}>Date</Text>
            <Text style={s.metaValue}>{formatQuoteDate(quote.generatedAt)}</Text>
            <Text style={s.metaLabel}>Service</Text>
            <Text style={s.metaValue}>{serviceLabel}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>{quote.title}</Text>
        <Text style={s.subtitle}>{quote.propertyContext}</Text>

        <View style={s.validityBadge}>
          <Text style={s.validityText}>
            Valid for {quote.validityDays} days from date of issue
          </Text>
        </View>

        {/* Property Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Property Details</Text>
          <View style={s.propertyGrid}>
            <View style={s.propertyItem}>
              <Text style={s.propertyLabel}>Location</Text>
              <Text style={s.propertyValue}>
                {form.zipCode}
                {areaName ? ` · ${areaName}` : ""}
              </Text>
            </View>
            <View style={s.propertyItem}>
              <Text style={s.propertyLabel}>Square Footage</Text>
              <Text style={s.propertyValue}>
                {Number(form.squareFootage).toLocaleString()} sq ft
              </Text>
            </View>
            <View style={s.propertyItem}>
              <Text style={s.propertyLabel}>Stories</Text>
              <Text style={s.propertyValue}>{storiesLabel}</Text>
            </View>
            <View style={s.propertyItem}>
              <Text style={s.propertyLabel}>Year Built</Text>
              <Text style={s.propertyValue}>{form.yearBuilt}</Text>
            </View>
            <View style={{ width: "100%", marginTop: 6 }}>
              <Text style={s.propertyLabel}>Job Description</Text>
              <Text style={[s.propertyValue, { fontFamily: "Helvetica", fontSize: 9, lineHeight: 1.4 }]}>
                {form.jobDescription}
              </Text>
            </View>
          </View>
        </View>

        {/* Price Summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Estimate Summary</Text>
          <View style={s.totalsRow}>
            {options.includePriceRanges && (
              <View style={s.totalCard}>
                <Text style={s.totalLabel}>Low Estimate</Text>
                <Text style={s.totalAmount}>{formatCurrency(totals.low)}</Text>
              </View>
            )}
            <View style={[s.totalCard, s.totalCardPrimary]}>
              <Text style={[s.totalLabel, s.totalLabelPrimary]}>Recommended</Text>
              <Text style={[s.totalAmount, s.totalAmountPrimary]}>
                {formatCurrency(totals.recommended)}
              </Text>
            </View>
            {options.includePriceRanges && (
              <View style={s.totalCard}>
                <Text style={s.totalLabel}>High Estimate</Text>
                <Text style={s.totalAmount}>{formatCurrency(totals.high)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line Items */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Line Items</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, s.colDescription]}>Description</Text>
              <Text style={[s.tableHeaderCell, s.colCategory]}>Category</Text>
              <Text style={[s.tableHeaderCell, s.colQty]}>Qty</Text>
              <Text style={[s.tableHeaderCell, s.colUnit]}>Unit</Text>
              <Text style={[s.tableHeaderCell, s.colUnitPrice]}>Unit Price</Text>
              <Text style={[s.tableHeaderCell, s.colTotal]}>Total</Text>
            </View>
            {quote.lineItems.map((item, index) => (
              <View
                key={item.id}
                style={[s.tableRow, index % 2 === 1 ? s.tableRowAlt : {}]}
              >
                <Text style={[s.tableCell, s.colDescription]}>{item.description}</Text>
                <Text style={[s.tableCell, s.colCategory]}>{item.category}</Text>
                <Text style={[s.tableCell, s.colQty]}>{item.quantity}</Text>
                <Text style={[s.tableCell, s.colUnit]}>{item.unit}</Text>
                <Text style={[s.tableCell, s.colUnitPrice]}>
                  {formatCurrencyDetailed(
                    unitPrice(item.priceRecommended, item.quantity)
                  )}
                </Text>
                <Text style={[s.tableCell, s.tableCellBold, s.colTotal]}>
                  {formatCurrency(item.priceRecommended)}
                </Text>
              </View>
            ))}
          </View>

          {/* Table totals */}
          <View style={{ marginTop: 12, alignItems: "flex-end" }}>
            {options.includePriceRanges && (
              <View style={{ flexDirection: "row", gap: 20, marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: colors.slate500 }}>Low Total:</Text>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", width: 80, textAlign: "right" }}>
                  {formatCurrency(totals.low)}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 20, marginBottom: 4 }}>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: colors.emerald700 }}>
                Recommended Total:
              </Text>
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: colors.emerald700, width: 80, textAlign: "right" }}>
                {formatCurrency(totals.recommended)}
              </Text>
            </View>
            {options.includePriceRanges && (
              <View style={{ flexDirection: "row", gap: 20 }}>
                <Text style={{ fontSize: 9, color: colors.slate500 }}>High Total:</Text>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", width: 80, textAlign: "right" }}>
                  {formatCurrency(totals.high)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Photo Analysis Summary */}
        {(() => {
          const photoAnalysis = normalizePhotoVisionAnalysis(quote.photoAnalysis);
          if (!photoAnalysis) return null;

          const hasFindings =
            photoAnalysis.visibleIssues.length > 0 ||
            photoAnalysis.equipmentIdentified.length > 0 ||
            photoAnalysis.suggestedScope.length > 0;

          return (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Photo Analysis Summary</Text>
              <Text
                style={[
                  s.bulletText,
                  { marginBottom: hasFindings ? 8 : 0, fontFamily: "Helvetica" },
                ]}
              >
                {photoAnalysis.summary}
              </Text>
              {photoAnalysis.visibleIssues.length > 0 ? (
                <View style={{ marginBottom: 6 }}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: "Helvetica-Bold",
                      color: colors.slate700,
                      marginBottom: 3,
                    }}
                  >
                    Visible Issues
                  </Text>
                  <View style={s.bulletList}>
                    {photoAnalysis.visibleIssues.map((issue) => (
                      <View key={issue.text} style={s.bulletItem}>
                        <View style={s.bullet} />
                        <Text style={s.bulletText}>
                          {observationText(issue)} ({issue.confidence}% confidence)
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {photoAnalysis.equipmentIdentified.length > 0 ? (
                <View style={{ marginBottom: 6 }}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: "Helvetica-Bold",
                      color: colors.slate700,
                      marginBottom: 3,
                    }}
                  >
                    Equipment Identified
                  </Text>
                  <View style={s.bulletList}>
                    {photoAnalysis.equipmentIdentified.map((item) => (
                      <View key={item.text} style={s.bulletItem}>
                        <View style={s.bullet} />
                        <Text style={s.bulletText}>
                          {observationText(item)} ({item.confidence}% confidence)
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {photoAnalysis.suggestedScope.length > 0 ? (
                <View>
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: "Helvetica-Bold",
                      color: colors.slate700,
                      marginBottom: 3,
                    }}
                  >
                    Suggested Scope
                  </Text>
                  <View style={s.bulletList}>
                    {photoAnalysis.suggestedScope.map((item) => (
                      <View key={item.text} style={s.bulletItem}>
                        <View style={s.bullet} />
                        <Text style={s.bulletText}>
                          {scopeItemText(item)}
                          {item.photoIndex !== undefined
                            ? ` (photo ${item.photoIndex})`
                            : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })()}

        {/* SWFL Alerts */}
        {options.includeAlerts && quote.alerts.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>SWFL Insights & Recommendations</Text>
            {quote.alerts.map((alert, index) => (
              <View
                key={`${alert.title}-${index}`}
                style={[
                  s.alertBox,
                  alert.type === "warning"
                    ? s.alertWarning
                    : alert.type === "suggestion"
                      ? s.alertSuggestion
                      : s.alertInfo,
                ]}
              >
                <Text
                  style={[
                    s.alertTitle,
                    {
                      color:
                        alert.type === "warning"
                          ? colors.amber700
                          : alert.type === "suggestion"
                            ? colors.emerald700
                            : colors.sky700,
                    },
                  ]}
                >
                  {alert.title}
                </Text>
                <Text style={s.alertMessage}>{alert.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Assumptions */}
        {options.includeAssumptions && quote.assumptions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Assumptions</Text>
            <View style={s.bulletList}>
              {quote.assumptions.map((item, index) => (
                <View key={index} style={s.bulletItem}>
                  <View style={s.bullet} />
                  <Text style={s.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {options.includeNotes && quote.notes.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notes</Text>
            <View style={s.bulletList}>
              {quote.notes.map((item, index) => (
                <View key={index} style={s.bulletItem}>
                  <View style={s.bullet} />
                  <Text style={s.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>
            {vendor.showPoweredByMercurius
              ? vendor.businessName
                ? `${brandName} · Powered by Mercurius`
                : "Generated by Mercurius"
              : brandName}
          </Text>
          <Text style={s.footerText}>
            {quoteReference} · Southwest Florida
          </Text>
          <Text style={s.footerText}>
            Valid {quote.validityDays} days · {formatQuoteDate(quote.generatedAt)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}