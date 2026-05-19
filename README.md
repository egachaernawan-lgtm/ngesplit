# ngesplit.

> Foto struk, assign ke teman, selesai. Bayar yang adil, pergi yang happy.

**ngesplit** is a mobile-first PWA for splitting restaurant bills fairly. Scan a receipt, assign each menu item to the people who ordered it, and instantly see how much everyone owes — including tax, service charge, and discounts.

---

## Features

- **AI Receipt Scanner** — scan or upload a receipt photo; Groq (Llama 4 Vision) reads the items, prices, tax, and service charge automatically
- **Smart Fallback** — if AI is unavailable, Tesseract.js handles OCR client-side
- **Manual Entry** — skip the camera and type items directly
- **Assign per Person** — tap each member's tab and check the items they ordered; shared items are split equally
- **Name Pills** — every item row shows who's assigned to it at a glance
- **Live Totals** — per-person subtotals update in real time as you assign
- **Shareable Result** — generate a link so everyone can see the final breakdown
- **PWA** — installable on iOS and Android, works offline after first load

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (persisted to localStorage) |
| Database | Supabase (bill sharing) |
| Primary OCR | Groq — Llama 4 Scout Vision |
| Fallback OCR | Tesseract.js (client-side) |
| Deployment | Vercel |

---

## App Flow

```
📷 Scan / Upload Receipt
        ↓
🤖 AI reads items, prices, tax & service
        ↓
✏️  Review & edit extracted items
        ↓
👥 Add members
        ↓
✅ Assign items to each person
        ↓
🧾 See final split — share the link
```

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/egachaernawan-lgtm/ngesplit.git
cd ngesplit
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
# Supabase (for shareable bill links)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Groq — primary AI OCR (free, no credit card)
# Get your key at https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

The app is built for **Vercel**. Add the environment variables above in your Vercel project settings, then deploy:

```bash
vercel --prod
```

> ⚠️ After adding or updating environment variables in Vercel, trigger a manual redeploy for changes to take effect.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `GROQ_API_KEY` | Yes | Groq API key for AI OCR |
| `GEMINI_API_KEY` | No | Legacy — no longer used in main flow |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Home — scan / upload / manual
│   ├── review/           # Review & edit OCR result
│   ├── members/          # Add people to the bill
│   ├── assign/           # Assign items to each person
│   ├── result/           # Final split breakdown
│   ├── shared/           # Public shareable bill view
│   └── api/
│       ├── ocr/          # Gemini OCR route (legacy)
│       └── ocr-groq/     # Groq AI OCR route (primary)
├── lib/
│   ├── store.ts          # Zustand bill store
│   ├── calculator.ts     # Bill total computation
│   ├── ocr.ts            # Tesseract text parser
│   └── supabase.ts       # Supabase client & save/load
└── types/
    └── bill.ts           # TypeScript interfaces
```

---

## License

MIT
