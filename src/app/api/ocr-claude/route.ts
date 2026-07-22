import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";

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

const MODEL = "claude-haiku-4-5";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ fallback: true, reason: "no_key" });
  }

  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body as { imageBase64?: string; mimeType?: string };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ fallback: true, reason: "bad_request" });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: PROMPT,
            },
          ],
        },
      ],
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "";

    if (!rawText) {
      console.error("[ocr-claude] Empty response");
      return NextResponse.json({ fallback: true, reason: "empty_response" });
    }

    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(jsonText);

    interface ClaudeItem {
      name?: unknown;
      quantity?: unknown;
      unitPrice?: unknown;
      total?: unknown;
    }

    const items = ((parsed.items ?? []) as ClaudeItem[]).map((item) => ({
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
    // Handle Anthropic rate limit errors
    if (e instanceof Anthropic.RateLimitError) {
      console.warn("[ocr-claude] Rate limit hit");
      return NextResponse.json({ fallback: true, reason: "rate_limit" });
    }
    console.error("[ocr-claude] Unexpected error:", e);
    return NextResponse.json({ fallback: true, reason: "exception", detail: String(e) });
  }
}
