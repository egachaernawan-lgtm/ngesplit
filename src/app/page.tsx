"use client";
import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, FileText, Loader2 } from "lucide-react";
import { createWorker } from "tesseract.js";
import Button from "@/components/ui/Button";
import { useBillStore } from "@/lib/store";
import { parseOcrText } from "@/lib/ocr";

export default function HomePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { initBill } = useBillStore();
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const [progress, setProgress] = useState(0);

  const processImage = useCallback(async (file: File) => {
    setStatus("processing");
    setProgress(0);

    try {
      const worker = await createWorker("eng+ind", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data } = await worker.recognize(file);
      await worker.terminate();

      const parsed = parseOcrText(data.text);

      initBill({
        restaurantName: parsed.restaurantName,
        items: parsed.items,
        servicePercent: parsed.servicePercent,
        serviceAmount: parsed.serviceAmount,
        taxPercent: parsed.taxPercent,
        taxAmount: parsed.taxAmount,
        discount: parsed.discount,
        ocrTotal: parsed.total,
      });

      router.push(`/review`);
    } catch {
      setStatus("idle");
    }
  }, [initBill, router]);

  const handleManual = () => {
    initBill({});
    router.push("/review");
  };

  return (
    <div className="flex flex-col min-h-screen px-4 pb-8">
      {/* Header */}
      <div className="pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-1.5 bg-[#E8FF5A]/10 border border-[#E8FF5A]/20 rounded-full px-3 py-1 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8FF5A]" />
          <span className="text-xs font-medium text-[#E8FF5A]">Split bills, not friendships</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-[#F5F5F5] mb-3">
          NGE<span className="text-[#E8FF5A]">SPLIT</span>
        </h1>
        <p className="text-[#888] text-sm leading-relaxed max-w-xs mx-auto">
          Foto struk, assign ke teman, selesai. Bayar yang adil, pergi yang happy.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {/* Camera capture */}
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={status === "processing"}
          className="group relative flex items-center gap-4 bg-[#E8FF5A] rounded-[16px] p-5 text-[#0A0A0A] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <div className="w-12 h-12 bg-[#0A0A0A]/10 rounded-[12px] flex items-center justify-center flex-shrink-0">
            <Camera size={22} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-base">Foto Struk</p>
            <p className="text-sm text-[#0A0A0A]/60">Gunakan kamera untuk scan</p>
          </div>
        </button>

        {/* File upload */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={status === "processing"}
          className="flex items-center gap-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] p-5 text-[#F5F5F5] transition-all active:scale-[0.98] hover:border-[#3A3A3A] disabled:opacity-50"
        >
          <div className="w-12 h-12 bg-[#2A2A2A] rounded-[12px] flex items-center justify-center flex-shrink-0">
            <Upload size={22} className="text-[#888]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-base">Upload Foto</p>
            <p className="text-sm text-[#888]">Pilih dari galeri</p>
          </div>
        </button>

        {/* Manual entry */}
        <button
          onClick={handleManual}
          disabled={status === "processing"}
          className="flex items-center gap-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] p-5 text-[#F5F5F5] transition-all active:scale-[0.98] hover:border-[#3A3A3A] disabled:opacity-50"
        >
          <div className="w-12 h-12 bg-[#2A2A2A] rounded-[12px] flex items-center justify-center flex-shrink-0">
            <FileText size={22} className="text-[#888]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-base">Input Manual</p>
            <p className="text-sm text-[#888]">Ketik sendiri item-nya</p>
          </div>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}
      />

      {/* Processing overlay */}
      {status === "processing" && (
        <div className="fixed inset-0 bg-[#0A0A0A]/90 flex flex-col items-center justify-center z-50 gap-4">
          <Loader2 size={32} className="text-[#E8FF5A] animate-spin" />
          <div className="text-center">
            <p className="text-[#F5F5F5] font-medium mb-1">Membaca struk...</p>
            <p className="text-[#888] text-sm">{progress}%</p>
          </div>
          <div className="w-48 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E8FF5A] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
