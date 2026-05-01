"use client";
import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { X, Users, SplitSquareHorizontal } from "lucide-react";
import { useBillStore } from "@/lib/store";
import StepHeader from "@/components/ui/StepHeader";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function MembersPage() {
  const router = useRouter();
  const { bill, addMember, removeMember, setSplitMode } = useBillStore();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!bill) router.replace("/");
  }, [bill, router]);

  if (!bill) return null;

  const handleAdd = () => {
    const name = input.trim();
    if (!name) return;
    addMember(name);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
  };

  const handleNext = () => {
    if (bill.splitMode === "equal") {
      router.push("/result");
    } else {
      router.push("/assign");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <StepHeader
        title="Tambah Teman"
        subtitle="Siapa yang ikut makan?"
        step={2}
        totalSteps={4}
        back="/review"
      />

      <div className="flex-1 flex flex-col gap-4 px-4 pb-32">
        {/* Split mode toggle */}
        <div>
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2">Cara Split</p>
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={bill.splitMode === "assign"}
              onClick={() => setSplitMode("assign")}
              icon={<SplitSquareHorizontal size={16} />}
              label="Assign Item"
              desc="Pilih item per orang"
            />
            <ModeButton
              active={bill.splitMode === "equal"}
              onClick={() => setSplitMode("equal")}
              icon={<Users size={16} />}
              label="Bagi Rata"
              desc="Total dibagi sama"
            />
          </div>
        </div>

        {/* Add member input */}
        <div>
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2">Anggota</p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[12px] px-4 py-3 text-sm text-[#F5F5F5] placeholder:text-[#444] focus:outline-none focus:border-[#E8FF5A]/50 transition-colors"
              placeholder="Nama teman... tekan Enter"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <Button variant="secondary" onClick={handleAdd} disabled={!input.trim()}>
              Tambah
            </Button>
          </div>
        </div>

        {/* Members list */}
        {bill.members.length === 0 ? (
          <Card className="py-10 flex flex-col items-center gap-2">
            <Users size={28} className="text-[#333]" />
            <p className="text-[#555] text-sm">Belum ada anggota</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {bill.members.map((member, idx) => (
              <div
                key={member.id}
                className="flex items-center justify-between bg-[#1A1A1A] border border-[#2A2A2A] rounded-[12px] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E8FF5A]/10 border border-[#E8FF5A]/20 flex items-center justify-center">
                    <span className="text-xs font-semibold text-[#E8FF5A]">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[#F5F5F5]">{member.name}</span>
                </div>
                <button
                  onClick={() => removeMember(member.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-[#2A2A2A] text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <p className="text-[#555] text-xs text-center pt-1">
              {bill.members.length} anggota
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-6 pt-3 bg-gradient-to-t from-[#0A0A0A] to-transparent">
        <Button
          fullWidth
          size="lg"
          onClick={handleNext}
          disabled={bill.members.length === 0}
        >
          {bill.splitMode === "equal"
            ? "Hitung Sekarang →"
            : "Lanjut → Assign Item"}
        </Button>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 p-3 rounded-[12px] border transition-all text-left",
        active
          ? "bg-[#E8FF5A]/10 border-[#E8FF5A]/40 text-[#E8FF5A]"
          : "bg-[#1A1A1A] border-[#2A2A2A] text-[#888] hover:border-[#3A3A3A]"
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-xs opacity-70">{desc}</p>
    </button>
  );
}
