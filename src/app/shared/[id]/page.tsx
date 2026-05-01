import { notFound } from "next/navigation";
import { loadBill } from "@/lib/supabase";
import { calculateResults } from "@/lib/calculator";
import { formatIDR } from "@/lib/currency";
import type { PersonResult } from "@/types/bill";

export const revalidate = 3600;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SharedPage({ params }: Props) {
  const { id } = await params;
  const bill = await loadBill(id);
  if (!bill) notFound();

  const results = calculateResults(bill);
  const colors = ["#E8FF5A", "#5AE8FF", "#FF5AE8", "#E8A05A", "#5AE880"];

  return (
    <div className="flex flex-col min-h-screen px-4 pb-12">
      {/* Header */}
      <div className="pt-10 pb-6 text-center">
        <p className="text-xs text-[#E8FF5A] font-medium mb-1">NGESPLIT</p>
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">
          {bill.restaurantName || "Hasil Split Bill"}
        </h1>
        <p className="text-sm text-[#888] mt-1">
          {new Date(bill.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Total */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] p-5 mb-4 flex justify-between items-center">
        <div>
          <p className="text-xs text-[#888]">Total Tagihan</p>
          <p className="text-2xl font-bold text-[#E8FF5A] tabular-nums">{formatIDR(bill.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#888]">{bill.members.length} orang</p>
          <p className="text-xs text-[#555] mt-0.5">
            {bill.splitMode === "equal" ? "Bagi rata" : "Per item"}
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-3">
        {results.map((result: PersonResult, idx: number) => (
          <SharedPersonCard
            key={result.member.id}
            result={result}
            color={colors[idx % colors.length]}
            splitMode={bill.splitMode}
          />
        ))}
      </div>

      {/* Footer branding */}
      <div className="mt-8 text-center">
        <p className="text-xs text-[#333]">Dibuat dengan</p>
        <p className="text-sm font-bold text-[#555]">NGESPLIT</p>
      </div>
    </div>
  );
}

function SharedPersonCard({
  result,
  color,
  splitMode,
}: {
  result: PersonResult;
  color: string;
  splitMode: "assign" | "equal";
}) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[12px] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#0A0A0A]"
            style={{ backgroundColor: color }}
          >
            {result.member.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-[#F5F5F5]">{result.member.name}</span>
        </div>
        <span className="text-base font-bold tabular-nums" style={{ color }}>
          {formatIDR(result.total)}
        </span>
      </div>

      {splitMode === "assign" && result.items.length > 0 && (
        <div className="border-t border-[#2A2A2A] px-4 py-3 flex flex-col gap-1.5">
          {result.items.map(({ item, subtotal }) => (
            <div key={item.id} className="flex justify-between">
              <span className="text-xs text-[#666] flex-1 mr-2 truncate">{item.name}</span>
              <span className="text-xs tabular-nums text-[#888]">{formatIDR(subtotal)}</span>
            </div>
          ))}
          {(result.serviceShare > 0 || result.taxShare > 0 || result.discountShare > 0) && (
            <div className="border-t border-[#222] pt-1.5 mt-0.5 flex flex-col gap-1">
              {result.serviceShare > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-[#444]">Service</span>
                  <span className="text-xs tabular-nums text-[#555]">+{formatIDR(result.serviceShare)}</span>
                </div>
              )}
              {result.taxShare > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-[#444]">Tax</span>
                  <span className="text-xs tabular-nums text-[#555]">+{formatIDR(result.taxShare)}</span>
                </div>
              )}
              {result.discountShare > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-[#444]">Diskon</span>
                  <span className="text-xs tabular-nums text-green-600">-{formatIDR(result.discountShare)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
