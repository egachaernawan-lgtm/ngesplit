import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ fallback: true, reason: "no_key" });
  }

  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body as { imageBase64?: string; mimeType?: string };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ fallback: true, reason: "bad_request" });
    }

    const form = new FormData();
    form.append("apikey", apiKey);
    form.append("base64Image", `data:${mimeType};base64,${imageBase64}`);
    form.append("OCREngine", "2");
    form.append("language", "eng");
    form.append("isTable", "true");
    form.append("scale", "true");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      console.error(`[ocr-space] API error ${response.status}`);
      return NextResponse.json({ fallback: true, reason: "api_error", status: response.status });
    }

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      console.error("[ocr-space] Processing error:", data.ErrorMessage);
      return NextResponse.json({ fallback: true, reason: "processing_error" });
    }

    const text: string = data.ParsedResults?.[0]?.ParsedText ?? "";
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    console.error("[ocr-space] Unexpected error:", e);
    return NextResponse.json({ fallback: true, reason: "exception" });
  }
}
