"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, FileText, Loader2 } from "lucide-react";
import { createWorker } from "tesseract.js";
import { useBillStore } from "@/lib/store";
import { parseOcrText } from "@/lib/ocr";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function HomePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { initBill } = useBillStore();
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const [progress, setProgress] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [showAndroidHint, setShowAndroidHint] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
    setIsInstalled(installed);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSHint(true);
      setTimeout(() => setShowIOSHint(false), 4000);
      return;
    }
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      return;
    }
    // Android but prompt not available yet — show manual hint
    setShowAndroidHint(true);
    setTimeout(() => setShowAndroidHint(false), 4000);
  };

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

  const showInstallButton = !isInstalled;

  return (
    <div className="flex flex-col min-h-screen px-4 pb-8">
      {/* Header */}
      <div className="pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-1.5 bg-[#E8FF5A]/10 border border-[#E8FF5A]/20 rounded-full px-3 py-1 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8FF5A]" />
          <span className="text-xs font-medium text-[#E8FF5A]">Split bills, not friendships</span>
        </div>

        {/* SVG Logo */}
        <div className="flex justify-center mb-3">
          <svg width="176" height="48" viewBox="0 0 44 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.08 3L1.632 5.388H1.692C1.7 4.692 1.848 4.092 2.136 3.588C2.432 3.076 2.932 2.82 3.636 2.82C4.212 2.82 4.68 3.056 5.04 3.528C5.4 3.992 5.58 4.628 5.58 5.436V8.988H3.9V5.628C3.9 5.252 3.816 4.964 3.648 4.764C3.488 4.556 3.252 4.452 2.94 4.452C2.684 4.452 2.46 4.548 2.268 4.74C2.076 4.932 1.932 5.172 1.836 5.46C1.74 5.748 1.692 6.036 1.692 6.324V8.988H0V3H1.08Z" fill="white"/>
            <path d="M9.16144 7.644C8.86544 7.644 8.65344 7.664 8.52544 7.704C8.40544 7.736 8.34544 7.796 8.34544 7.884C8.34544 7.964 8.38144 8.028 8.45344 8.076C8.53344 8.124 8.68144 8.164 8.89744 8.196L10.2174 8.388C10.7934 8.484 11.2494 8.648 11.5854 8.88C11.9214 9.104 12.0894 9.464 12.0894 9.96C12.0894 10.456 11.9534 10.932 11.6814 11.388H9.82144C10.1334 10.956 10.2894 10.604 10.2894 10.332C10.2894 10.212 10.2534 10.12 10.1814 10.056C10.1094 9.992 9.97744 9.944 9.78544 9.912L7.87744 9.576C7.42944 9.496 7.08144 9.372 6.83344 9.204C6.58544 9.044 6.46144 8.816 6.46144 8.52C6.46144 8.176 6.64544 7.932 7.01344 7.788C7.38944 7.644 7.94544 7.56 8.68144 7.536V7.5C7.93744 7.42 7.38944 7.192 7.03744 6.816C6.69344 6.432 6.52144 5.908 6.52144 5.244C6.52144 4.796 6.60144 4.388 6.76144 4.02C6.92944 3.652 7.17344 3.36 7.49344 3.144C7.81344 2.928 8.19744 2.82 8.64544 2.82C9.22944 2.82 9.64544 3.024 9.89344 3.432C10.1414 3.832 10.2734 4.308 10.2894 4.86H10.3494L10.7094 2.316H11.8014V5.316C11.8014 6.012 11.5774 6.576 11.1294 7.008C10.6814 7.432 10.0254 7.644 9.16144 7.644ZM8.22544 5.244C8.22544 5.572 8.30944 5.824 8.47744 6C8.65344 6.168 8.90144 6.252 9.22144 6.252C9.54144 6.252 9.78544 6.168 9.95344 6C10.1214 5.824 10.2054 5.572 10.2054 5.244C10.2054 4.932 10.1174 4.688 9.94144 4.512C9.77344 4.328 9.53344 4.236 9.22144 4.236C8.90144 4.236 8.65344 4.324 8.47744 4.5C8.30944 4.676 8.22544 4.924 8.22544 5.244Z" fill="white"/>
            <path d="M15.4388 9.18C14.9108 9.18 14.4188 9.076 13.9628 8.868C13.5068 8.66 13.1308 8.32 12.8348 7.848C12.5468 7.368 12.4028 6.752 12.4028 6C12.4028 5.016 12.6588 4.24 13.1708 3.672C13.6828 3.104 14.3788 2.82 15.2588 2.82C16.1228 2.82 16.7988 3.08 17.2868 3.6C17.7748 4.12 18.0188 4.852 18.0188 5.796C18.0188 6.052 17.9988 6.26 17.9588 6.42H14.1188C14.2228 7.236 14.6988 7.644 15.5468 7.644C15.8508 7.644 16.1428 7.6 16.4228 7.512C16.7028 7.424 16.9428 7.304 17.1428 7.152L17.2148 8.772C16.7348 9.044 16.1428 9.18 15.4388 9.18ZM16.4228 5.604C16.3908 5.244 16.2708 4.964 16.0628 4.764C15.8628 4.556 15.5948 4.452 15.2588 4.452C14.9468 4.452 14.6868 4.572 14.4788 4.812C14.2788 5.044 14.1548 5.36 14.1068 5.76L16.4228 5.604Z" fill="white"/>
            <path d="M18.4492 4.62C18.4492 4.06 18.6572 3.62 19.0732 3.3C19.4972 2.98 20.0812 2.82 20.8252 2.82C21.2092 2.82 21.5772 2.86 21.9292 2.94C22.2892 3.02 22.5972 3.128 22.8532 3.264L22.7692 4.848C22.5052 4.712 22.1972 4.604 21.8452 4.524C21.5012 4.436 21.1812 4.392 20.8852 4.392C20.4692 4.392 20.2612 4.536 20.2612 4.824C20.2612 4.976 20.3212 5.096 20.4412 5.184C20.5692 5.272 20.8092 5.356 21.1612 5.436C21.8412 5.604 22.3332 5.836 22.6372 6.132C22.9412 6.42 23.0932 6.8 23.0932 7.272C23.0932 7.848 22.8692 8.312 22.4212 8.664C21.9812 9.008 21.3612 9.18 20.5612 9.18C19.7212 9.18 19.0052 9.016 18.4132 8.688L18.4972 6.996C19.2572 7.388 19.9452 7.584 20.5612 7.584C20.7692 7.584 20.9372 7.548 21.0652 7.476C21.1932 7.396 21.2572 7.276 21.2572 7.116C21.2572 6.796 20.9772 6.572 20.4172 6.444C19.9052 6.34 19.5052 6.208 19.2172 6.048C18.9372 5.888 18.7372 5.696 18.6172 5.472C18.5052 5.24 18.4492 4.956 18.4492 4.62Z" fill="white"/>
            <path d="M23.8477 3H24.9277L25.4677 5.22H25.5277C25.5677 4.452 25.7477 3.86 26.0677 3.444C26.3957 3.028 26.8557 2.82 27.4477 2.82C28.1517 2.82 28.6997 3.1 29.0917 3.66C29.4917 4.212 29.6917 4.992 29.6917 6C29.6917 7 29.5037 7.78 29.1277 8.34C28.7517 8.9 28.2277 9.18 27.5557 9.18C26.9717 9.18 26.4997 8.956 26.1397 8.508C25.7877 8.052 25.5837 7.42 25.5277 6.612H25.4437L25.5397 8.58V11.388H23.8477V3ZM25.5877 6.012C25.5877 6.484 25.7037 6.856 25.9357 7.128C26.1677 7.392 26.4837 7.524 26.8837 7.524C27.2357 7.524 27.5077 7.392 27.6997 7.128C27.8997 6.856 27.9997 6.48 27.9997 6C27.9997 5.512 27.8997 5.136 27.6997 4.872C27.4997 4.6 27.2237 4.464 26.8717 4.464C26.4717 4.464 26.1557 4.604 25.9237 4.884C25.6997 5.156 25.5877 5.532 25.5877 6.012Z" fill="white"/>
            <path d="M32.1139 0V8.988H30.4219V0H32.1139Z" fill="white"/>
            <path d="M35.2353 8.988H33.5553V4.56H33.0033V3H35.2353V8.988ZM34.2273 2.208C33.9313 2.208 33.6993 2.124 33.5313 1.956C33.3713 1.788 33.2913 1.556 33.2913 1.26C33.2913 0.964 33.3713 0.732 33.5313 0.564C33.6993 0.396 33.9313 0.312 34.2273 0.312C34.5073 0.312 34.7273 0.396 34.8873 0.564C35.0553 0.732 35.1393 0.964 35.1393 1.26C35.1393 1.556 35.0553 1.788 34.8873 1.956C34.7273 2.124 34.5073 2.208 34.2273 2.208Z" fill="white"/>
            <path d="M40.2245 9.048C39.9845 9.136 39.6205 9.18 39.1325 9.18C38.4205 9.172 37.8405 8.976 37.3925 8.592C36.9525 8.2 36.7325 7.548 36.7325 6.636V4.56H35.9165V3H36.9365L36.7325 1.236H38.6405L37.9805 3H40.1765V4.56H38.4125V6.528C38.4125 6.92 38.5045 7.192 38.6885 7.344C38.8725 7.488 39.1205 7.56 39.4325 7.56C39.7365 7.56 39.9765 7.528 40.1525 7.464L40.2245 9.048Z" fill="white"/>
            <path d="M43.376 7.988C43.376 8.54028 42.9283 8.988 42.376 8.988C41.8237 8.988 41.376 8.54028 41.376 7.988C41.376 7.43571 41.8237 6.988 42.376 6.988C42.9283 6.988 43.376 7.43571 43.376 7.988Z" fill="#E8FF5A"/>
          </svg>
        </div>

        <p className="text-[#888] text-sm leading-relaxed max-w-xs mx-auto">
          Foto struk, assign ke teman, selesai. Bayar yang adil, pergi yang happy.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
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

      {/* Add to Home Screen */}
      {showInstallButton && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-[#F5F5F5]">Add me to your Home Feed</p>
          <button
            onClick={handleInstall}
            className="active:scale-95 transition-transform"
            aria-label="Add NGESPLIT to home screen"
          >
            <svg width="83" height="83" viewBox="0 0 83 83" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="82.3701" height="82.3701" rx="17" fill="white"/>
              <path d="M37.8749 13.0868C51.5649 13.0869 62.663 24.1849 62.663 37.8749C62.6629 51.5649 51.5649 62.6629 37.8749 62.663C24.1849 62.663 13.0869 51.5649 13.0868 37.8749C13.0868 24.1849 24.1849 13.0868 37.8749 13.0868ZM37.8749 20.1689C28.0963 20.1689 20.1689 28.0963 20.1689 37.8749C20.1689 47.6535 28.0963 55.581 37.8749 55.581C47.6534 55.5809 55.5809 47.6534 55.581 37.8749C55.581 28.0963 47.6535 20.1689 37.8749 20.1689Z" fill="black"/>
              <path d="M55.5805 37.8748C55.5805 47.6534 47.6534 55.5805 37.8748 55.5805C28.0962 55.5805 20.1691 47.6534 20.1691 37.8748C20.1691 28.0962 28.0962 20.1691 37.8748 20.1691C47.6534 20.1691 55.5805 28.0962 55.5805 37.8748Z" fill="black"/>
              <path d="M44.9572 20.1691C58.6472 20.1691 69.7453 31.2672 69.7453 44.9572C69.7452 58.6472 58.6472 69.7452 44.9572 69.7453C31.2672 69.7453 20.1691 58.6472 20.1691 44.9572C20.1691 31.2671 31.2671 20.1691 44.9572 20.1691ZM44.9572 27.2511C35.1786 27.2511 27.2511 35.1786 27.2511 44.9572C27.2512 54.7357 35.1786 62.6632 44.9572 62.6632C54.7357 62.6632 62.6632 54.7357 62.6632 44.9572C62.6632 35.1786 54.7357 27.2512 44.9572 27.2511Z" fill="#D0DF73"/>
              <path d="M62.6628 44.9571C62.6628 54.7357 54.7357 62.6628 44.9571 62.6628C35.1785 62.6628 27.2513 54.7357 27.2513 44.9571C27.2513 35.1785 35.1785 27.2513 44.9571 27.2513C54.7357 27.2513 62.6628 35.1785 62.6628 44.9571Z" fill="#E8FF5A"/>
            </svg>
          </button>

          {/* Hint toasts */}
          {showIOSHint && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[12px] px-4 py-3 text-sm text-[#F5F5F5] max-w-xs text-center">
              Tap the <strong>Share</strong> button then <strong>"Add to Home Screen"</strong>
            </div>
          )}
          {showAndroidHint && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[12px] px-4 py-3 text-sm text-[#F5F5F5] max-w-xs text-center">
              Tap <strong>⋮ Menu</strong> then <strong>"Add to Home Screen"</strong>
            </div>
          )}
        </div>
      )}

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
