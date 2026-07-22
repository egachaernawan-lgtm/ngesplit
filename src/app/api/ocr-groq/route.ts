import { NextRequest, NextResponse } from "next/server";
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

// Preferred model first; fallback if model doesn't exist or access denied
const GROQ_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "llama-3.2-90b-vision-preview",
];
const RETRY_DELAY_MS = 3000;

async function callGroq(apiKey: string, model: string, imageBase64: string, mimeType: string): Promise<Response> {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    }),
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ fallback: true, reason: "no_key" });
  }

  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body as { imageBase64?: string; mimeType?: string };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ fallback: true, reason: "bad_request" });
    }

    let response: Response | null = null;

    // Try each model in order; skip to next on 404 (model not found) or 401 (no access)
    for (const model of GROQ_MODELS) {
      response = await callGroq(apiKey, model, imageBase64, mimeType);

      if (response.status === 429) {
        console.warn(`[ocr-groq] Rate limit on ${model}, retrying after delay…`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        response = await callGroq(apiKey, model, imageBase64, mimeType);
      }

      if (response.ok) {
        console.log(`[ocr-groq] Success with model: ${model}`);
        break;
      }

      // 404 or model-access error → try next model
      if (response.status === 400 || response.status === 404) {
        const errBody = await response.text();
        if (errBody.includes("does not exist") || errBody.includes("do not have access")) {
          console.warn(`[ocr-groq] Model unavailable: ${model}, trying next…`);
          continue;
        }
      }

      break; // Other errors (500, etc.) — stop trying
    }

    if (response!.status === 429) {
      console.warn("[ocr-groq] Rate limit persists");
      return NextResponse.json({ fallback: true, reason: "rate_limit" });
    }

    if (!response!.ok) {
      const errText = await response!.text();
      console.error(`[ocr-groq] API error ${response!.status}:`, errText);
      return NextResponse.json({ fallback: true, reason: "api_error", status: response!.status, detail: errText });
    }

    const data = await response!.json();
    const rawText: string = data.choices?.[0]?.message?.content ?? "";

    if (!rawText) {
      console.error("[ocr-groq] Empty response");
      return NextResponse.json({ fallback: true, reason: "empty_response" });
    }

    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(jsonText);

    interface GroqItem {
      name?: unknown;
      quantity?: unknown;
      unitPrice?: unknown;
      total?: unknown;
    }

    const items = ((parsed.items ?? []) as GroqItem[]).map((item) => ({
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
    console.error("[ocr-groq] Unexpected error:", e);
    return NextResponse.json({ fallback: true, reason: "exception", detail: String(e) });
  }
}
