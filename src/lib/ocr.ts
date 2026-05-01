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

// Patterns for Indonesian receipts
const PRICE_RE = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{0,2})?)/g;
const TOTAL_KEYWORDS = /\b(total|grand\s*total|jumlah|tagihan)\b/i;
const SUBTOTAL_KEYWORDS = /\b(sub\s*total|subtotal|jumlah\s*menu)\b/i;
const SERVICE_KEYWORDS = /\b(service\s*charge|service|pelayanan)\b/i;
const TAX_KEYWORDS = /\b(tax|ppn|pajak|pb1)\b/i;
const DISCOUNT_KEYWORDS = /\b(disc(?:ount)?|diskon|potongan)\b/i;

function cleanPrice(raw: string): number {
  // Handle both 10.000 and 10,000 and 10000 formats
  const cleaned = raw.replace(/\./g, "").replace(/,/g, "");
  return parseInt(cleaned, 10) || 0;
}

function extractLastPrice(line: string): number {
  const matches = Array.from(line.matchAll(PRICE_RE));
  if (matches.length === 0) return 0;
  return cleanPrice(matches[matches.length - 1][1]);
}

function extractPercent(line: string): number {
  const match = line.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (match) return parseFloat(match[1].replace(",", "."));
  return 0;
}

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

  // First non-empty line is likely the restaurant name
  if (lines.length > 0) {
    result.restaurantName = lines[0];
  }

  let idCounter = 0;
  const nextId = () => `item-${++idCounter}`;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (TOTAL_KEYWORDS.test(lower) && !SUBTOTAL_KEYWORDS.test(lower)) {
      const price = extractLastPrice(line);
      if (price > 0) result.total = price;
      continue;
    }

    if (SUBTOTAL_KEYWORDS.test(lower)) {
      const price = extractLastPrice(line);
      if (price > 0) result.subtotal = price;
      continue;
    }

    if (SERVICE_KEYWORDS.test(lower)) {
      const pct = extractPercent(line);
      const price = extractLastPrice(line);
      if (pct > 0) result.servicePercent = pct;
      if (price > 0) result.serviceAmount = price;
      continue;
    }

    if (TAX_KEYWORDS.test(lower)) {
      const pct = extractPercent(line);
      const price = extractLastPrice(line);
      if (pct > 0) result.taxPercent = pct;
      if (price > 0) result.taxAmount = price;
      continue;
    }

    if (DISCOUNT_KEYWORDS.test(lower)) {
      const price = extractLastPrice(line);
      if (price > 0) result.discount = price;
      continue;
    }

    // Attempt to parse as a menu item line: "Item Name  qty  price"
    const priceMatches = Array.from(line.matchAll(PRICE_RE));
    if (priceMatches.length >= 1) {
      // Heuristic: if there's a price at the end and the line isn't just a number
      const lastPrice = cleanPrice(priceMatches[priceMatches.length - 1][1]);
      if (lastPrice >= 1000) {
        // Strip the prices from the name
        const name = line
          .replace(PRICE_RE, "")
          .replace(/[xX×]\s*\d+/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        if (name.length >= 2) {
          let quantity = 1;
          let price = lastPrice;

          // Try to detect qty × price pattern
          const qtyMatch = line.match(/(\d+)\s*[xX×]\s*(\d[\d.,]*)/);
          if (qtyMatch) {
            quantity = parseInt(qtyMatch[1], 10);
            price = cleanPrice(qtyMatch[2]);
          }

          result.items.push({
            id: nextId(),
            name,
            price,
            quantity,
            total: lastPrice,
          });
        }
      }
    }
  }

  return result;
}
