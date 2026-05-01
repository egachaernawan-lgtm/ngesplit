"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { nanoid } from "nanoid";
import { useBillStore } from "@/lib/store";
import { formatIDR, parseIDR } from "@/lib/currency";
import type { MenuItem } from "@/types/bill";
import StepHeader from "@/components/ui/StepHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function ReviewPage() {
  const router = useRouter();
  const { bill, updateItems, updateCharges, updateRestaurantName, save } = useBillStore();
  const [showCharges, setShowCharges] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bill) router.replace("/");
  }, [bill, router]);

  if (!bill) return null;

  const updateItem = (id: string, field: keyof MenuItem, raw: string) => {
    const items = bill.items.map((item) => {
      if (item.id !== id) return item;
      const value = field === "name" ? raw : parseIDR(raw);
      const updated = { ...item, [field]: value };
      if (field === "price" || field === "quantity") {
        updated.total = updated.price * updated.quantity;
      }
      if (field === "total") {
        updated.price = updated.quantity > 0 ? Math.round(updated.total / updated.quantity) : updated.total;
      }
      return updated;
    });
    updateItems(items);
  };

  const addItem = () => {
    const newItem: MenuItem = { id: nanoid(6), name: "", price: 0, quantity: 1, total: 0 };
    updateItems([...bill.items, newItem]);
  };

  const removeItem = (id: string) => {
    updateItems(bill.items.filter((i) => i.id !== id));
  };

  const handleNext = async () => {
    setSaving(true);
    await save();
    setSaving(false);
    router.push("/members");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <StepHeader
        title="Cek Struk"
        subtitle="Edit jika ada yang salah"
        step={1}
        totalSteps={4}
        back="/"
      />

      <div className="flex-1 flex flex-col gap-3 px-4 pb-32">
        {/* Restaurant name */}
        <Input
          label="Nama Restoran"
          value={bill.restaurantName}
          onChange={(e) => updateRestaurantName(e.target.value)}
          placeholder="Nama restoran..."
        />

        {/* Items */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#888] uppercase tracking-wider">Item Menu</p>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-xs text-[#E8FF5A] font-medium"
            >
              <Plus size={12} />
              Tambah
            </button>
          </div>

          {bill.items.length === 0 && (
            <Card className="py-8 flex flex-col items-center gap-2">
              <p className="text-[#888] text-sm">Belum ada item</p>
              <button onClick={addItem} className="text-[#E8FF5A] text-sm font-medium">
                + Tambah item
              </button>
            </Card>
          )}

          {bill.items.map((item, idx) => (
            <Card key={item.id} className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <span className="text-[#555] text-xs mt-1 w-4 text-center">{idx + 1}</span>
                <input
                  className="flex-1 bg-transparent text-sm text-[#F5F5F5] placeholder:text-[#444] focus:outline-none"
                  placeholder="Nama menu..."
                  value={item.name}
                  onChange={(e) => updateItem(item.id, "name", e.target.value)}
                />
                <button onClick={() => removeItem(item.id)} className="text-[#555] hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex gap-2 ml-6">
                <div className="flex-1">
                  <p className="text-[10px] text-[#555] mb-1">Harga</p>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-[8px] px-2 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E8FF5A]/50 tabular-nums"
                    value={item.price || ""}
                    placeholder="0"
                    onChange={(e) => updateItem(item.id, "price", e.target.value)}
                  />
                </div>
                <div className="w-14">
                  <p className="text-[10px] text-[#555] mb-1">Qty</p>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-[8px] px-2 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E8FF5A]/50 text-center tabular-nums"
                    value={item.quantity || ""}
                    placeholder="1"
                    min={1}
                    onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-[#555] mb-1">Total</p>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-full bg-[#111] border border-[#2A2A2A] rounded-[8px] px-2 py-2 text-xs text-[#E8FF5A] focus:outline-none focus:border-[#E8FF5A]/50 tabular-nums font-medium"
                    value={item.total || ""}
                    placeholder="0"
                    onChange={(e) => updateItem(item.id, "total", e.target.value)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Charges section */}
        <div>
          <button
            className="flex items-center justify-between w-full py-2"
            onClick={() => setShowCharges(!showCharges)}
          >
            <p className="text-xs font-medium text-[#888] uppercase tracking-wider">Biaya Tambahan</p>
            {showCharges ? <ChevronUp size={14} className="text-[#888]" /> : <ChevronDown size={14} className="text-[#888]" />}
          </button>

          {showCharges && (
            <Card className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Service (%)"
                  type="number"
                  inputMode="decimal"
                  suffix="%"
                  value={bill.servicePercent || ""}
                  placeholder="0"
                  onChange={(e) => updateCharges({ servicePercent: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Tax / PPN (%)"
                  type="number"
                  inputMode="decimal"
                  suffix="%"
                  value={bill.taxPercent || ""}
                  placeholder="0"
                  onChange={(e) => updateCharges({ taxPercent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <Input
                label="Diskon (Rp)"
                type="number"
                inputMode="numeric"
                prefix="Rp"
                value={bill.discount || ""}
                placeholder="0"
                onChange={(e) => updateCharges({ discount: parseIDR(e.target.value) })}
              />
            </Card>
          )}
        </div>

        {/* Summary */}
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider mb-1">Ringkasan</p>
          <SummaryRow label="Sub Total" value={bill.subtotal} />
          {bill.serviceAmount > 0 && (
            <SummaryRow label={`Service (${bill.servicePercent}%)`} value={bill.serviceAmount} />
          )}
          {bill.taxAmount > 0 && (
            <SummaryRow label={`Tax (${bill.taxPercent}%)`} value={bill.taxAmount} />
          )}
          {bill.discount > 0 && (
            <SummaryRow label="Diskon" value={-bill.discount} className="text-green-400" />
          )}
          {bill.etc !== 0 && (
            <SummaryRow
              label="Etc"
              value={bill.etc}
              className={bill.etc < 0 ? "text-green-400" : "text-[#888]"}
              hint="Selisih dari struk"
            />
          )}
          <div className="border-t border-[#2A2A2A] pt-2 mt-1">
            <SummaryRow label="TOTAL" value={bill.total} bold />
          </div>
        </Card>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-6 pt-3 bg-gradient-to-t from-[#0A0A0A] to-transparent">
        <Button fullWidth size="lg" onClick={handleNext} disabled={saving || bill.items.length === 0}>
          {saving ? "Menyimpan..." : "Lanjut → Tambah Teman"}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  className,
  hint,
}: {
  label: string;
  value: number;
  bold?: boolean;
  className?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className={`text-sm ${bold ? "font-semibold text-[#F5F5F5]" : "text-[#888]"}`}>
          {label}
        </span>
        {hint && <span className="text-[10px] text-[#555] ml-1.5">({hint})</span>}
      </div>
      <span
        className={`text-sm tabular-nums ${bold ? "font-semibold text-[#E8FF5A]" : ""} ${className || (bold ? "" : "text-[#F5F5F5]")}`}
      >
        {formatIDR(value)}
      </span>
    </div>
  );
}
