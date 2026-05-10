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

// Items total / sub total — checked BEFORE grand total
const SUBTOTAL_RE =
  /\b(sub\s*total|subtotal|items?\s*total|item\s*total|total\s*item|jumlah\s*(?:item|menu|makanan|order))\b/i;

// Grand total
const GRAND_TOTAL_RE =
  /\b(grand\s*total|total\s*bayar|total\s*tagihan|total\s*akhir|total\s*pembayaran|total\s*keseluruhan|total\s*bill)\b|\btotal\s*:?\s*\d|\btotal\b(?!\s*item)/i;

// Service charge
const SERVICE_RE =
  /\b(service\s*charge|service|pelayanan|servis|gratuity|svc|srv)\b|(?:^|[\s&+])service\b/i;

// Tax
const TAX_RE =
  /\b(tax|ppn|pb\.?1|pajak(?:\s*restoran)?|vat|duty)\b/i;

// Discount / promo
const DISCOUNT_RE =
  /\b(disc(?:ount)?|diskon|promo(?:si)?|potongan|voucher|cashback|reduc\w*)\b/i;

// Line that STARTS with a percentage: "10% BEAUTIFUL BALI 63,192"
const STARTS_WITH_PCT_RE = /^(\d+(?:[.,]\d+)?)\s*%/;

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanPrice(raw: string): number {
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

// Strip noise characters used as price prefixes on receipts (·, -, +, •)
function stripNoise(line: string): string {
  return line.replace(/[·•\-+]/g, " ").replace(/\s{2,}/g, " ").trim();
}

// Extract the largest price from a line (ignores small standalone digits like qty)
function extractItemPrice(line: string): number {
  const matches = Array.from(line.matchAll(PRICE_RE))
    .map((m) => cleanPrice(m[1]))
    .filter((n) => n >= 1000); // ignore qty/small numbers
  return matches.length ? Math.max(...matches) : 0;
}

// Get clean item name from a line (strip price matches + noise)
function extractItemName(line: string): string {
  return line
    .replace(PRICE_RE, "")          // remove all number groups
    .replace(/[·•\-+×xX]/g, " ")   // remove noise chars
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Whether a line looks like a receipt item name (not a date, code, or footer phrase)
function isItemNameCandidate(line: string): boolean {
  const lower = line.toLowerCase();

  // Skip known non-item patterns
  if (
    /\d{2}[-/]\d{2}[-/]\d{4}/.test(line) || // date
    /\d{2}:\d{2}/.test(line) ||              // time
    /\b(reg|cash|terima kasih|silahkan|kembali|atas kunjungan|indonesia|rest area|tol |km |table|meja|kasir)\b/i.test(lower)
  ) return false;

  // Must have at least 2 alphabetic characters
  const letters = line.replace(/[^A-Za-z]/g, "");
  return letters.length >= 2;
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

  // State for associating split "name line" → "price line" pairs
  // e.g. "2 NASI PUTIH" on one line, "·20,000" on the next
  let pendingName = "";
  let pendingQty = 1;

  // Unclassified % lines for service/tax fallback
  const unclassifiedPct: { pct: number; amount: number }[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const cleaned = stripNoise(line);

    // ── Sub total / items total (must be before grand total) ─────────────────
    if (SUBTOTAL_RE.test(lower)) {
      pendingName = "";
      const price = extractLastPrice(line);
      if (price > 0) result.subtotal = price;
      continue;
    }

    // ── Grand total ──────────────────────────────────────────────────────────
    if (GRAND_TOTAL_RE.test(lower)) {
      pendingName = "";
      const price = extractLastPrice(line);
      if (price > 0) result.total = price;
      continue;
    }

    // ── Service charge ───────────────────────────────────────────────────────
    if (SERVICE_RE.test(lower)) {
      pendingName = "";
      const pct = extractPercent(line);
      const price = extractLastPrice(line);
      if (pct > 0) result.servicePercent = pct;
      if (price > 0) result.serviceAmount = price;
      continue;
    }

    // ── Tax ──────────────────────────────────────────────────────────────────
    if (TAX_RE.test(lower)) {
      pendingName = "";
      const pct = extractPercent(line);
      const price = extractLastPrice(line);
      if (pct > 0) result.taxPercent = pct;
      if (price > 0) result.taxAmount = price;
      continue;
    }

    // ── Discount ─────────────────────────────────────────────────────────────
    if (DISCOUNT_RE.test(lower)) {
      pendingName = "";
      const price = extractLastPrice(line);
      if (price > 0) result.discount = price;
      continue;
    }

    // ── Lines starting with "X%" ─────────────────────────────────────────────
    const pctLineMatch = cleaned.match(STARTS_WITH_PCT_RE);
    if (pctLineMatch) {
      pendingName = "";
      const pct = parseFloat(pctLineMatch[1].replace(",", "."));
      const amount = extractLastPrice(line);
      if (pct > 0 && amount > 0) unclassifiedPct.push({ pct, amount });
      continue;
    }

    // ── Item detection ───────────────────────────────────────────────────────
    const itemPrice = extractItemPrice(cleaned);
    const itemName = extractItemName(cleaned);
    const hasPrice = itemPrice > 0;
    const hasName = itemName.length >= 2;

    if (hasPrice && hasName) {
      // ✅ Normal line: "1 AYAM BAKAR 21,000"
      let qty = 1;
      let unitPrice = itemPrice;

      // Leading quantity: "2 NASI PUTIH 20,000" → qty=2, unit=10,000
      const leadingQty = cleaned.match(/^(\d{1,2})\s+[A-Za-z]/);
      if (leadingQty) {
        qty = parseInt(leadingQty[1], 10);
        unitPrice = qty > 1 ? Math.round(itemPrice / qty) : itemPrice;
      }

      // Explicit "2 x 10,000" pattern overrides above
      const explicitQty = cleaned.match(/(\d+)\s*[xX×]\s*(\d[\d.,]*)/);
      if (explicitQty) {
        qty = parseInt(explicitQty[1], 10);
        unitPrice = cleanPrice(explicitQty[2]);
      }

      result.items.push({ id: nextId(), name: itemName, price: unitPrice, quantity: qty, total: itemPrice });
      pendingName = "";

    } else if (hasPrice && !hasName && pendingName) {
      // ✅ Price-only line after a pending name: "·20,000" following "2 NASI PUTIH"
      result.items.push({
        id: nextId(),
        name: pendingName,
        price: pendingQty > 1 ? Math.round(itemPrice / pendingQty) : itemPrice,
        quantity: pendingQty,
        total: itemPrice,
      });
      pendingName = "";

    } else if (!hasPrice && isItemNameCandidate(cleaned)) {
      // ✅ Name-only line: "2 NASI PUTIH" — store and wait for price on next line
      const leadingQty = cleaned.match(/^(\d{1,2})\s+[A-Za-z]/);
      pendingQty = leadingQty ? parseInt(leadingQty[1], 10) : 1;
      pendingName = leadingQty
        ? cleaned.replace(/^\d{1,2}\s+/, "")
        : cleaned;

    } else {
      // Not an item, not a name candidate — reset pending
      pendingName = "";
    }
  }

  // ── Fallback: assign unclassified % lines to service then tax ────────────────
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
