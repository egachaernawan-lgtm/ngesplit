import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Bill, MenuItem, Member, Assignment, SplitMode } from "@/types/bill";
import { computeBillTotals } from "./calculator";
import { saveBill } from "./supabase";

interface BillStore {
  bill: Bill | null;
  initBill: (partial: Partial<Bill>) => void;
  setBill: (bill: Bill) => void;
  updateItems: (items: MenuItem[]) => void;
  updateCharges: (charges: Partial<Pick<Bill, "servicePercent" | "taxPercent" | "discount">>) => void;
  updateRestaurantName: (name: string) => void;
  addMember: (name: string) => void;
  removeMember: (id: string) => void;
  setSplitMode: (mode: SplitMode) => void;
  setAssignments: (assignments: Assignment[]) => void;
  toggleItemMember: (itemId: string, memberId: string) => void;
  save: () => Promise<void>;
  reset: () => void;
}

function recompute(bill: Bill): Bill {
  const totals = computeBillTotals(bill);
  return { ...bill, ...totals };
}

export const useBillStore = create<BillStore>()(
  persist(
    (set, get) => ({
      bill: null,

      initBill: (partial) => {
        const bill: Bill = {
          id: nanoid(10),
          restaurantName: "",
          createdAt: new Date().toISOString(),
          items: [],
          subtotal: 0,
          servicePercent: 0,
          serviceAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          discount: 0,
          etc: 0,
          ocrTotal: 0,
          total: 0,
          members: [],
          assignments: [],
          splitMode: "assign",
          ...partial,
        };
        set({ bill: recompute(bill) });
      },

      setBill: (bill) => set({ bill }),

      updateItems: (items) =>
        set((s) => {
          if (!s.bill) return s;
          return { bill: recompute({ ...s.bill, items }) };
        }),

      updateCharges: (charges) =>
        set((s) => {
          if (!s.bill) return s;
          return { bill: recompute({ ...s.bill, ...charges }) };
        }),

      updateRestaurantName: (name) =>
        set((s) => {
          if (!s.bill) return s;
          return { bill: { ...s.bill, restaurantName: name } };
        }),

      addMember: (name) =>
        set((s) => {
          if (!s.bill) return s;
          const member: Member = { id: nanoid(6), name };
          return { bill: { ...s.bill, members: [...s.bill.members, member] } };
        }),

      removeMember: (id) =>
        set((s) => {
          if (!s.bill) return s;
          const members = s.bill.members.filter((m) => m.id !== id);
          const assignments = s.bill.assignments.map((a) => ({
            ...a,
            memberIds: a.memberIds.filter((mid) => mid !== id),
          }));
          return { bill: { ...s.bill, members, assignments } };
        }),

      setSplitMode: (mode) =>
        set((s) => {
          if (!s.bill) return s;
          return { bill: { ...s.bill, splitMode: mode } };
        }),

      setAssignments: (assignments) =>
        set((s) => {
          if (!s.bill) return s;
          return { bill: { ...s.bill, assignments } };
        }),

      toggleItemMember: (itemId, memberId) =>
        set((s) => {
          if (!s.bill) return s;
          const assignments = [...s.bill.assignments];
          const idx = assignments.findIndex((a) => a.itemId === itemId);
          if (idx === -1) {
            assignments.push({ itemId, memberIds: [memberId] });
          } else {
            const memberIds = assignments[idx].memberIds.includes(memberId)
              ? assignments[idx].memberIds.filter((id) => id !== memberId)
              : [...assignments[idx].memberIds, memberId];
            if (memberIds.length === 0) {
              assignments.splice(idx, 1);
            } else {
              assignments[idx] = { ...assignments[idx], memberIds };
            }
          }
          return { bill: { ...s.bill, assignments } };
        }),

      save: async () => {
        const { bill } = get();
        if (!bill) return;
        const result = await saveBill(bill);
        if (!result.ok) {
          console.error("[store.save] Failed:", result.error);
        }
      },

      reset: () => set({ bill: null }),
    }),
    {
      name: "ngesplit-bill",
      partialize: (s) => ({ bill: s.bill }),
    }
  )
);
