"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, Check, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useBillStore } from "@/lib/store";
import { calculateResults } from "@/lib/calculator";
import { formatIDR } from "@/lib/currency";
import type { PersonResult } from "@/types/bill";
import StepHeader from "@/components/ui/StepHeader";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function ResultPage() {
  const router = useRouter();
  const { bill, reset } = useBillStore();
  const [results, setResults] = useState<PersonResult[]>([]);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!bill) { router.replace("/"); return; }
    setResults(calculateResults(bill));
  }, [bill, router]);

  if (!bill) return null;

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/shared/${bill.id}`
    : `/shared/${bill.id}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "NGESPLIT", url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const handleReset = () => {
    reset();
    router.push("/");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <StepHeader
        title="Hasil Split"
        subtitle={bill.restaurantName || "Tagihan"}
        step={4}
        totalSteps={4}
        back={bill.splitMode === "equal" ? "/members" : "/assign"}
      />

      <div className="flex-1 flex flex-col gap-3 px-4 pb-36">
        {/* Total card */}
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#888]">Total Tagihan</p>
            <p className="text-2xl font-bold text-[#E8FF5A] tabular-nums mt-0.5">
              {formatIDR(bill.total)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#888]">{bill.members.length} orang</p>
            <p className="text-sm text-[#555]">
              {bill.splitMode === "equal" ? "Bagi rata" : "Per item"}
            </p>
          </div>
        </Card>

        {/* Per person results */}
        <div className="flex flex-col gap-2">
          {results.map((result, idx) => (
            <PersonCard
              key={result.member.id}
              result={result}
              index={idx}
              isExpanded={expanded === result.member.id}
              onToggle={() =>
                setExpanded(expanded === result.member.id ? null : result.member.id)
              }
              splitMode={bill.splitMode}
            />
          ))}
        </div>

        {/* Reconciliation */}
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider mb-1">Cek Total</p>
          <div className="flex justify-between">
            <span className="text-sm text-[#888]">Total tagihan</span>
            <span className="text-sm tabular-nums text-[#F5F5F5]">{formatIDR(bill.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-[#888]">Total dikumpulkan</span>
            <span className="text-sm tabular-nums text-[#F5F5F5]">
              {formatIDR(results.reduce((s, r) => s + r.total, 0))}
            </span>
          </div>
          {Math.abs(bill.total - results.reduce((s, r) => s + r.total, 0)) > 0 && (
            <div className="flex justify-between border-t border-[#2A2A2A] pt-2">
              <span className="text-sm text-amber-400">Selisih pembulatan</span>
              <span className="text-sm tabular-nums text-amber-400">
                {formatIDR(bill.total - results.reduce((s, r) => s + r.total, 0))}
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-6 pt-3 bg-gradient-to-t from-[#0A0A0A] to-transparent flex flex-col gap-2">
        <Button fullWidth size="lg" onClick={handleShare}>
          {copied ? (
            <span className="flex items-center gap-2"><Check size={16} />Link tersalin!</span>
          ) : (
            <span className="flex items-center gap-2"><Share2 size={16} />Bagikan Hasil</span>
          )}
        </Button>
        <Button fullWidth variant="ghost" onClick={handleReset}>
          <span className="flex items-center gap-2 text-[#888]"><RotateCcw size={14} />Split baru</span>
        </Button>
      </div>
    </div>
  );
}

function PersonCard({
  result,
  index,
  isExpanded,
  onToggle,
  splitMode,
}: {
  result: PersonResult;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  splitMode: "assign" | "equal";
}) {
  const colors = ["#E8FF5A", "#5AE8FF", "#FF5AE8", "#E8A05A", "#5AE880"];
  const color = colors[index % colors.length];

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[12px] overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#0A0A0A]"
            style={{ backgroundColor: color }}
          >
            {result.member.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-[#F5F5F5]">{result.member.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tabular-nums" style={{ color }}>
            {formatIDR(result.total)}
          </span>
          {splitMode === "assign" && (
            isExpanded ? <ChevronUp size={14} className="text-[#555]" /> : <ChevronDown size={14} className="text-[#555]" />
          )}
        </div>
      </button>

      {isExpanded && splitMode === "assign" && (
        <div className="border-t border-[#2A2A2A] px-4 py-3 flex flex-col gap-2">
          {result.items.map(({ item, subtotal }) => (
            <div key={item.id} className="flex justify-between items-center">
              <span className="text-xs text-[#888] flex-1 mr-2 truncate">{item.name || "—"}</span>
              <span className="text-xs tabular-nums text-[#F5F5F5] flex-shrink-0">{formatIDR(subtotal)}</span>
            </div>
          ))}
          <div className="border-t border-[#222] pt-2 flex flex-col gap-1">
            <DetailRow label="Sub total" value={result.subtotal} />
            {result.serviceShare > 0 && <DetailRow label="Service" value={result.serviceShare} />}
            {result.taxShare > 0 && <DetailRow label="Tax" value={result.taxShare} />}
            {result.discountShare > 0 && <DetailRow label="Diskon" value={-result.discountShare} green />}
            {result.etcShare !== 0 && <DetailRow label="Etc" value={result.etcShare} />}
            <div className="flex justify-between items-center pt-1 border-t border-[#222]">
              <span className="text-xs font-semibold text-[#F5F5F5]">Total</span>
              <span className="text-sm font-bold tabular-nums" style={{ color }}>
                {formatIDR(result.total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, green }: { label: string; value: number; green?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-[#555]">{label}</span>
      <span className={cn("text-xs tabular-nums", green ? "text-green-400" : "text-[#888]")}>
        {formatIDR(value)}
      </span>
    </div>
  );
}
