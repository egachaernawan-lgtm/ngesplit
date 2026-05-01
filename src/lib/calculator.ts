import type { Bill, PersonResult } from "@/types/bill";

export function computeBillTotals(bill: Pick<Bill,
  "items" | "servicePercent" | "taxPercent" | "discount" | "ocrTotal"
>): Pick<Bill, "subtotal" | "serviceAmount" | "taxAmount" | "etc" | "total"> {
  const subtotal = bill.items.reduce((sum, item) => sum + item.total, 0);
  const serviceAmount = Math.round(subtotal * (bill.servicePercent / 100));
  const taxAmount = Math.round((subtotal + serviceAmount) * (bill.taxPercent / 100));
  const discount = Math.round(bill.discount);
  const computed = subtotal + serviceAmount + taxAmount - discount;
  const etc = bill.ocrTotal > 0 ? bill.ocrTotal - computed : 0;
  const total = computed + etc;

  return { subtotal, serviceAmount, taxAmount, etc, total };
}

export function calculateResults(bill: Bill): PersonResult[] {
  if (bill.splitMode === "equal") {
    return calculateEqual(bill);
  }
  return calculateAssigned(bill);
}

function calculateAssigned(bill: Bill): PersonResult[] {
  const { subtotal, serviceAmount, taxAmount, discount, etc, total } = bill;

  const results: PersonResult[] = bill.members.map((member) => ({
    member,
    items: [],
    subtotal: 0,
    serviceShare: 0,
    taxShare: 0,
    discountShare: 0,
    etcShare: 0,
    total: 0,
  }));

  const resultMap = new Map(results.map((r) => [r.member.id, r]));

  for (const assignment of bill.assignments) {
    const item = bill.items.find((i) => i.id === assignment.itemId);
    if (!item || assignment.memberIds.length === 0) continue;

    const portionCount = assignment.memberIds.length;
    const baseShare = Math.floor(item.total / portionCount);
    const remainder = item.total - baseShare * portionCount;

    assignment.memberIds.forEach((memberId, idx) => {
      const r = resultMap.get(memberId);
      if (!r) return;
      const share = idx === 0 ? baseShare + remainder : baseShare;
      r.items.push({ item, portion: 1 / portionCount, subtotal: share });
      r.subtotal += share;
    });
  }

  // Distribute proportional charges; last member absorbs rounding remainders
  const memberIds = bill.members.map((m) => m.id);
  distributeProportional(resultMap, memberIds, subtotal, serviceAmount, "serviceShare");
  distributeProportional(resultMap, memberIds, subtotal, taxAmount, "taxShare");
  distributeProportional(resultMap, memberIds, subtotal, -discount, "discountShare");
  distributeProportional(resultMap, memberIds, subtotal, etc, "etcShare");

  for (const r of results) {
    r.total = r.subtotal + r.serviceShare + r.taxShare - r.discountShare + r.etcShare;
  }

  return results;
}

function distributeProportional(
  resultMap: Map<string, PersonResult>,
  memberIds: string[],
  subtotal: number,
  amount: number,
  field: "serviceShare" | "taxShare" | "discountShare" | "etcShare"
) {
  if (subtotal === 0 || amount === 0) return;

  let distributed = 0;
  for (let i = 0; i < memberIds.length; i++) {
    const r = resultMap.get(memberIds[i]);
    if (!r) continue;
    if (i === memberIds.length - 1) {
      r[field] = amount - distributed;
    } else {
      const share = Math.round((r.subtotal / subtotal) * amount);
      r[field] = share;
      distributed += share;
    }
  }
}

function calculateEqual(bill: Bill): PersonResult[] {
  const n = bill.members.length;
  if (n === 0) return [];

  const base = Math.floor(bill.total / n);
  const remainder = bill.total - base * n;

  // Randomly but deterministically assign remainder using member order
  return bill.members.map((member, idx) => ({
    member,
    items: [],
    subtotal: Math.floor(bill.subtotal / n),
    serviceShare: 0,
    taxShare: 0,
    discountShare: 0,
    etcShare: 0,
    total: idx < remainder ? base + 1 : base,
  }));
}
