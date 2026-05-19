import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const endpoint = process.env.AZURE_CV_ENDPOINT;
  const key = process.env.AZURE_CV_KEY;

  if (!endpoint || !key) {
    return NextResponse.json({ fallback: true, reason: "no_key" });
  }

  try {
    const body = await req.json();
    const { imageBase64 } = body as { imageBase64?: string };

    if (!imageBase64) {
      return NextResponse.json({ fallback: true, reason: "bad_request" });
    }

    const imageBuffer = Buffer.from(imageBase64, "base64");
    const url = `${endpoint.replace(/\/$/, "")}/computervision/imageanalysis:analyze?api-version=2023-10-01&features=read&language=en`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Ocp-Apim-Subscription-Key": key,
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ocr-azure] API error ${response.status}:`, errText);
      return NextResponse.json({ fallback: true, reason: "api_error", status: response.status, detail: errText });
    }

    const data = await response.json();
    const text: string = data.readResult?.content ?? "";

    return NextResponse.json({ ok: true, text });
  } catch (e) {
    console.error("[ocr-azure] Unexpected error:", e);
    return NextResponse.json({ fallback: true, reason: "exception", detail: String(e) });
  }
}
