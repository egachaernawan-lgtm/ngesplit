"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useBillStore } from "@/lib/store";
import { formatIDR } from "@/lib/currency";
import StepHeader from "@/components/ui/StepHeader";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function AssignPage() {
  const router = useRouter();
  const { bill, toggleItemMember, save } = useBillStore();
  const [activeTab, setActiveTab] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bill) { router.replace("/"); return; }
    if (bill.members.length > 0 && !activeTab) {
      setActiveTab(bill.members[0].id);
    }
  }, [bill, router, activeTab]);

  if (!bill) return null;

  const getAssignment = (itemId: string) =>
    bill.assignments.find((a) => a.itemId === itemId);

  const isAssigned = (itemId: string, memberId: string) =>
    getAssignment(itemId)?.memberIds.includes(memberId) ?? false;

  const getMemberSubtotal = (memberId: string) => {
    let total = 0;
    for (const item of bill.items) {
      const assignment = getAssignment(item.id);
      if (!assignment) continue;
      if (assignment.memberIds.includes(memberId)) {
        total += item.total / assignment.memberIds.length;
      }
    }
    return total;
  };

  const unassignedItems = bill.items.filter(
    (item) => !getAssignment(item.id) || getAssignment(item.id)!.memberIds.length === 0
  );

  const handleNext = async () => {
    setSaving(true);
    try {
      await save();
    } catch (e) {
      console.error("Failed to save bill:", e);
    } finally {
      setSaving(false);
      router.push("/result");
    }
  };

  const activeMember = bill.members.find((m) => m.id === activeTab);

  return (
    <div className="flex flex-col min-h-screen">
      <StepHeader
        title="Assign Item"
        subtitle="Pilih menu untuk setiap orang"
        step={3}
        totalSteps={4}
        back="/members"
      />

      <div className="flex-1 flex flex-col gap-3 px-4 pb-32">
        {/* Member tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {bill.members.map((member) => {
            const subtotal = getMemberSubtotal(member.id);
            return (
              <button
                key={member.id}
                onClick={() => setActiveTab(member.id)}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center gap-0.5 px-4 py-2 rounded-[10px] border transition-all",
                  activeTab === member.id
                    ? "bg-[#E8FF5A]/10 border-[#E8FF5A]/40"
                    : "bg-[#1A1A1A] border-[#2A2A2A]"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    activeTab === member.id ? "text-[#E8FF5A]" : "text-[#888]"
                  )}
                >
                  {member.name}
                </span>
                <span className="text-[10px] text-[#555] tabular-nums">
                  {formatIDR(subtotal)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Unassigned warning */}
        {unassignedItems.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-[10px] px-3 py-2">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300">
              {unassignedItems.length} item belum di-assign
            </p>
          </div>
        )}

        {/* Item list */}
        {activeMember && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[#888]">
              Centang item yang dimakan <span className="text-[#E8FF5A] font-medium">{activeMember.name}</span>
            </p>
            {bill.items.map((item) => {
              const assignment = getAssignment(item.id);
              const checked = isAssigned(item.id, activeTab);
              const sharedWith = assignment?.memberIds.filter((id) => id !== activeTab) ?? [];
              const sharedCount = (assignment?.memberIds.length ?? 0);
              const portionPrice = sharedCount > 0 ? item.total / sharedCount : item.total;

              return (
                <button
                  key={item.id}
                  onClick={() => toggleItemMember(item.id, activeTab)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-[12px] border text-left transition-all active:scale-[0.99]",
                    checked
                      ? "bg-[#E8FF5A]/5 border-[#E8FF5A]/30"
                      : "bg-[#1A1A1A] border-[#2A2A2A]"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                      checked ? "bg-[#E8FF5A] border-[#E8FF5A]" : "border-[#3A3A3A]"
                    )}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn("text-sm font-medium", checked ? "text-[#F5F5F5]" : "text-[#888]")}>
                        {item.name || "Item tanpa nama"}
                      </span>
                      <div className="text-right flex-shrink-0">
                        <span className={cn("text-sm tabular-nums", checked ? "text-[#E8FF5A] font-semibold" : "text-[#555]")}>
                          {formatIDR(checked ? portionPrice : item.total)}
                        </span>
                        {item.quantity > 1 && (
                          <p className="text-[10px] text-[#555]">×{item.quantity}</p>
                        )}
                      </div>
                    </div>
                    {checked && sharedWith.length > 0 && (
                      <p className="text-[10px] text-[#888] mt-0.5">
                        Sharing dengan{" "}
                        {sharedWith
                          .map((id) => bill.members.find((m) => m.id === id)?.name)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Per-person summary */}
        <Card className="mt-2">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider mb-3">Ringkasan per Orang</p>
          <div className="flex flex-col gap-2">
            {bill.members.map((member) => (
              <div key={member.id} className="flex justify-between items-center">
                <span className="text-sm text-[#888]">{member.name}</span>
                <span className="text-sm tabular-nums text-[#F5F5F5] font-medium">
                  {formatIDR(getMemberSubtotal(member.id))}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-6 pt-3 bg-gradient-to-t from-[#0A0A0A] to-transparent">
        {unassignedItems.length > 0 && (
          <p className="text-xs text-[#888] text-center mb-2">
            {unassignedItems.length} item belum di-assign — tetap lanjut?
          </p>
        )}
        <Button fullWidth size="lg" onClick={handleNext} disabled={saving}>
          {saving ? "Menyimpan..." : "Hitung Sekarang →"}
        </Button>
      </div>
    </div>
  );
}
