# ngesplit API Documentation

Internal API routes for the ngesplit Next.js application.

---

## Base URL

```
https://your-vercel-domain.vercel.app/api
```

---

## Routes

### `POST /api/ocr-groq`

Primary OCR endpoint. Sends a receipt image to Groq (Llama 4 Scout Vision) and returns structured bill data as JSON.

**Request**

```http
POST /api/ocr-groq
Content-Type: application/json
```

```json
{
  "imageBase64": "string",
  "mimeType": "image/jpeg"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `imageBase64` | string | Yes | Base64-encoded image (no data URL prefix) |
| `mimeType` | string | Yes | MIME type of the image, e.g. `image/jpeg` |

**Success Response** `200 OK`

```json
{
  "ok": true,
  "result": {
    "restaurantName": "Warung Makan Sederhana",
    "items": [
      {
        "id": "abc123",
        "name": "Ayam Goreng",
        "price": 25000,
        "quantity": 2,
        "total": 50000
      }
    ],
    "subtotal": 50000,
    "servicePercent": 5,
    "serviceAmount": 2500,
    "taxPercent": 11,
    "taxAmount": 5500,
    "discount": 0,
    "total": 58000
  }
}
```

**Fallback Response** `200 OK`

Returned when Groq is unavailable. The client should fall back to Tesseract.js.

```json
{
  "fallback": true,
  "reason": "rate_limit" | "api_error" | "no_key" | "bad_request" | "empty_response" | "exception",
  "status": 429,
  "detail": "Raw error message from Groq (truncated)"
}
```

| Reason | Description |
|---|---|
| `no_key` | `GROQ_API_KEY` environment variable is not set |
| `bad_request` | `imageBase64` or `mimeType` missing from request body |
| `rate_limit` | Groq rate limit hit after 2 attempts with 3s retry |
| `api_error` | Groq returned a non-200 HTTP response |
| `empty_response` | Groq returned an empty content body |
| `exception` | Unexpected server-side error |

---

### `POST /api/ocr`

Legacy OCR endpoint using Gemini 2.0 Flash. Same request/response shape as `/api/ocr-groq`. Kept for reference but no longer used as primary in the app flow.

**Request**

```http
POST /api/ocr
Content-Type: application/json
```

```json
{
  "imageBase64": "string",
  "mimeType": "image/jpeg"
}
```

**Success Response** `200 OK`

Same structure as `/api/ocr-groq` success response.

**Fallback Response** `200 OK`

Same structure as `/api/ocr-groq` fallback response, with additional reasons:

| Reason | Description |
|---|---|
| `no_key` | `GEMINI_API_KEY` environment variable is not set |
| `rate_limit` | Gemini 429 hit after 2 attempts with 3s retry |
| `api_error` | Gemini returned a non-200 HTTP response |
| `empty_response` | Gemini returned empty content |
| `exception` | Unexpected server-side error |

---

## Data Types

### `OcrResult`

Returned inside `result` on successful OCR responses.

```ts
{
  restaurantName: string       // Name at the top of the receipt
  items: MenuItem[]
  subtotal: number             // Sum of all item totals (IDR, integer)
  servicePercent: number       // e.g. 5 for 5%
  serviceAmount: number        // Actual service charge in IDR
  taxPercent: number           // e.g. 11 for 11%
  taxAmount: number            // Actual tax amount in IDR
  discount: number             // Discount amount in IDR
  total: number                // Grand total in IDR
}
```

### `MenuItem`

```ts
{
  id: string          // nanoid(6) — unique within the bill
  name: string        // Menu item name as read from the receipt
  price: number       // Unit price in IDR
  quantity: number    // Number of units ordered
  total: number       // price × quantity in IDR
}
```

---

## Supabase (Bill Persistence)

Bill sharing uses Supabase directly from the client via the JS SDK — there is no dedicated API route for this.

### Save a Bill

Called when the user taps **Hitung Sekarang** on the assign page.

```ts
// Table: bills
// upsert by id
{
  id: string          // nanoid(10) — bill identifier
  data: Bill          // Full bill object (see types/bill.ts)
  updated_at: string  // ISO 8601 timestamp
}
```

### Load a Bill

Called on the `/shared/[id]` page to render a public view.

```ts
// SELECT data FROM bills WHERE id = :id
```

Returns `null` if the bill does not exist.

---

## OCR Flow

```
Client (browser)
  │
  ├─ POST /api/ocr-groq ──→ Groq API (Llama 4 Vision)
  │      ok: true            returns structured JSON
  │
  └─ fallback: true
       │
       └─ Tesseract.js (client-side)
            raw text → parseOcrText() → structured data
```

---

## Error Handling Notes

- All API routes return `200 OK` even on failure — check the `ok` or `fallback` field in the response body
- `detail` and `status` fields are only present on `api_error` responses to aid debugging
- Monetary values are always **integers in IDR** — no decimals, no currency symbols
