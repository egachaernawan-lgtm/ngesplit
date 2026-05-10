import type { MenuItem } from "@/types/bill";

export interface OcrResult {
  restaurantName: string;
  items: MenuItem[];
  subtotal: number;
  servicePercent: number;
  serviceAmount: number;
  taxPercent: number;
  taxAmount: number;
  discount: number;
  total: number;
}

// ── Regex patterns ────────────────────────────────────────────────────────────

const PRICE_RE = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{0,2})?)/g;

// Items total / sub total — checked BEFORE grand total to avoid mis-classification
const SUBTOTAL_RE =
  /\b(sub\s*total|subtotal|items?\s*total|item\s*total|total\s*item|jumlah\s*(?:item|menu|makanan|order))\b/i;

// Grand total — standalone "total" or explicit grand-total labels
const GRAND_TOTAL_RE =
  /\b(grand\s*total|total\s*bayar|total\s*tagihan|total\s*akhir|total\s*pembayaran|total\s*keseluruhan|total\s*bill)\b|\btotal\s*:?\s*\d|\btotal\b(?!\s*item)/i;

// Service charge — handles "Service", "& Service", "Service Charge", "Srv", etc.
const SERVICE_RE =
  /\b(service\s*charge|service|pelayanan|servis|gratuity|svc|srv)\b|(?:^|[\s&+])service\b/i;

// Tax — handles "Tax", "PPN", "PB1", "PB.1", "Pajak", "VAT"
const TAX_RE =
  /\b(tax|ppn|pb\.?1|pajak(?:\s*restoran)?|vat|duty)\b/i;

// Discount / promo
const DISCOUNT_RE =
  /\b(disc(?:ount)?|diskon|promo(?:si)?|potongan|voucher|cashback|reduc\w*)\b/i;

// Line that STARTS with a percentage: "10% Service Name  12,000"
// Common in Indonesian receipts where no standard keyword is used
const STARTS_WITH_PCT_RE = /^(\d+(?:[.,]\d+)?)\s*%/;

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanPrice(raw: string): number {
  // Handles both 1.053.200 and 1,053,200 Indonesian formats
  return parseInt(raw.replace(/[.,]/g, ""), 10) || 0;
}

function extractLastPrice(line: string): number {
  const matches = Array.from(line.matchAll(PRICE_RE));
  if (!matches.length) return 0;
  return cleanPrice(matches[matches.length - 1][1]);
}

function extractPercent(line: string): number {
  const m = line.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m ? parseFloat(m[1].replace(",", ".")) : 0;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseOcrText(raw: string): OcrResult {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const result: OcrResult = {
    restaurantName: "",
    items: [],
    subtotal: 0,
    servicePercent: 0,
    serviceAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    discount: 0,
    total: 0,
  };

  if (lines.length > 0) result.restaurantName = lines[0];

  let idCounter = 0;
  const nextId = () => `item-${++idCounter}`;

  // Unclassified % lines — e.g. "10% BEAUTIFUL BALI 63,192"
  // We'll assign these to service/tax as a fallback at the end
  const unclassifiedPct: { pct: number; amount: number }[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // ── Sub total / items total (must be before grand total) ──────────────────
    if (SUBTOTAL_RE.test(lower)) {
      const price = extractLastPrice(line);
      if (price > 0) result.subtotal = price;
      continue;
    }

    // ── Grand total ───────────────────────────────────────────────────────────
    if (GRAND_TOTAL_RE.test(lower)) {
      const price = extractLastPrice(line);
      if (price > 0) result.total = price;
      continue;
    }

    // ── Service charge ────────────────────────────────────────────────────────
    if (SERVICE_RE.test(lower)) {
      const pct = extractPercent(line);
      const price = extractLastPrice(line);
      if (pct > 0) result.servicePercent = pct;
      if (price > 0) result.serviceAmount = price;
      continue;
    }

    // ── Tax ───────────────────────────────────────────────────────────────────
    if (TAX_RE.test(lower)) {
      const pct = extractPercent(line);
      const price = extractLastPrice(line);
      if (pct > 0) result.taxPercent = pct;
      if (price > 0) result.taxAmount = price;
      continue;
    }

    // ── Discount ──────────────────────────────────────────────────────────────
    if (DISCOUNT_RE.test(lower)) {
      const price = extractLastPrice(line);
      if (price > 0) result.discount = price;
      continue;
    }

    // ── Lines starting with "X%" — e.g. "10% BEAUTIFUL BALI 63,192" ──────────
    // These are charges with a non-standard label; collect for fallback assignment
    const pctLineMatch = line.match(STARTS_WITH_PCT_RE);
    if (pctLineMatch) {
      const pct = parseFloat(pctLineMatch[1].replace(",", "."));
      const amount = extractLastPrice(line);
      if (pct > 0 && amount > 0) {
        unclassifiedPct.push({ pct, amount });
      }
      continue; // never treat as a menu item
    }

    // ── Menu item ─────────────────────────────────────────────────────────────
    const priceMatches = Array.from(line.matchAll(PRICE_RE));
    if (priceMatches.length >= 1) {
      const lastPrice = cleanPrice(priceMatches[priceMatches.length - 1][1]);
      if (lastPrice >= 1000) {
        const name = line
          .replace(PRICE_RE, "")
          .replace(/[xX×]\s*\d+/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        if (name.length >= 2) {
          let quantity = 1;
          let price = lastPrice;
          const qtyMatch = line.match(/(\d+)\s*[xX×]\s*(\d[\d.,]*)/);
          if (qtyMatch) {
            quantity = parseInt(qtyMatch[1], 10);
            price = cleanPrice(qtyMatch[2]);
          }
          result.items.push({ id: nextId(), name, price, quantity, total: lastPrice });
        }
      }
    }
  }

  // ── Fallback: assign unclassified % lines to service then tax ────────────────
  // Indonesian receipts often write "10% Service Name 12,000" without a keyword.
  // First unclassified % line → service, second → tax (most common receipt order).
  if (unclassifiedPct.length >= 1 && result.servicePercent === 0 && result.serviceAmount === 0) {
    result.servicePercent = unclassifiedPct[0].pct;
    result.serviceAmount = unclassifiedPct[0].amount;
  }
  if (unclassifiedPct.length >= 2 && result.taxPercent === 0 && result.taxAmount === 0) {
    result.taxPercent = unclassifiedPct[1].pct;
    result.taxAmount = unclassifiedPct[1].amount;
  }

  return result;
}
