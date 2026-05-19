import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

// ── Prompt ────────────────────────────────────────────────────────────────────

const PROMPT = `You are a receipt parser for Indonesian restaurants. Analyze this receipt image and return ONLY a valid JSON object. No markdown, no code blocks, no explanation — raw JSON only.

Return exactly this structure:
{
  "restaurantName": "",
  "items": [
    { "name": "", "quantity": 1, "unitPrice": 0, "total": 0 }
  ],
  "subtotal": 0,
  "servicePercent": 0,
  "serviceAmount": 0,
  "taxPercent": 0,
  "taxAmount": 0,
  "discount": 0,
  "total": 0
}

STRICT RULES — follow exactly:

1. "restaurantName": The business/restaurant name at the very top of the receipt. If unclear, use the most prominent text.

2. "items": ONLY actual food and beverage menu items that were ordered.
   NEVER include these as items (put them in their own fields instead):
   - Sub Total / Subtotal / Jumlah
   - Grand Total / Total Bayar / Total Tagihan / Total
   - Service Charge / Service / Pelayanan / Servis
   - Tax / PPN / Pajak / VAT / PB1
   - Discount / Diskon / Promo / Potongan
   - Change / Kembalian / Cash / Tunai
   - Any line that is a summary, charge, or payment line

3. "subtotal": Sum of all item totals before service/tax/discount.

4. "servicePercent": Service charge percentage (e.g. 5 for 5%). Use 0 if not shown.
   "serviceAmount": Actual service charge amount in Rupiah from the receipt. Use 0 if none.

5. "taxPercent": Tax/PPN percentage (e.g. 11 for 11%). Use 0 if not shown.
   "taxAmount": Actual tax amount in Rupiah from the receipt. Use 0 if none.

6. "discount": Discount/promo amount in Rupiah (positive integer). Use 0 if none.

7. "total": The final grand total amount the customer must pay.

8. All monetary values are integers in IDR (no decimals, no currency symbols).
   unitPrice = price per 1 unit; total = unitPrice × quantity.`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ fallback: true, reason: "no_key" });
  }

  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body as { imageBase64?: string; mimeType?: string };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ fallback: true, reason: "bad_request" });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inlineData: { mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });

    if (response.status === 429) {
      console.warn("[ocr/gemini] Rate limit hit — falling back to Tesseract");
      return NextResponse.json({ fallback: true, reason: "rate_limit" });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ocr/gemini] API error ${response.status}:`, errText);
      return NextResponse.json({ fallback: true, reason: "api_error", status: response.status, detail: errText });
    }

    const data = await response.json();
    const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText) {
      console.error("[ocr/gemini] Empty response from Gemini");
      return NextResponse.json({ fallback: true, reason: "empty_response" });
    }

    // Strip markdown fences if the model added them despite instructions
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(jsonText);

    interface GeminiItem {
      name?: unknown;
      quantity?: unknown;
      unitPrice?: unknown;
      total?: unknown;
    }

    const items = ((parsed.items ?? []) as GeminiItem[]).map((item) => ({
      id: nanoid(6),
      name: String(item.name ?? ""),
      price: Math.round(Number(item.unitPrice ?? 0)),
      quantity: Math.max(1, Math.round(Number(item.quantity ?? 1))),
      total: Math.round(Number(item.total ?? 0)),
    }));

    return NextResponse.json({
      ok: true,
      result: {
        restaurantName: String(parsed.restaurantName ?? ""),
        items,
        subtotal: Math.round(Number(parsed.subtotal ?? 0)),
        servicePercent: Number(parsed.servicePercent ?? 0),
        serviceAmount: Math.round(Number(parsed.serviceAmount ?? 0)),
        taxPercent: Number(parsed.taxPercent ?? 0),
        taxAmount: Math.round(Number(parsed.taxAmount ?? 0)),
        discount: Math.round(Number(parsed.discount ?? 0)),
        total: Math.round(Number(parsed.total ?? 0)),
      },
    });
  } catch (e) {
    console.error("[ocr/gemini] Unexpected error:", e);
    return NextResponse.json({ fallback: true, reason: "exception" });
  }
}
