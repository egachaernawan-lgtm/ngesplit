export interface MenuItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Member {
  id: string;
  name: string;
}

// portions: memberId → fraction of item (0–1). Multiple members share an item equally.
export interface Assignment {
  itemId: string;
  memberIds: string[];
}

export type SplitMode = "assign" | "equal";

export interface Bill {
  id: string;
  restaurantName: string;
  createdAt: string;
  items: MenuItem[];
  subtotal: number;
  servicePercent: number;
  serviceAmount: number;
  taxPercent: number;
  taxAmount: number;
  discount: number;
  etc: number;
  ocrTotal: number;
  total: number;
  members: Member[];
  assignments: Assignment[];
  splitMode: SplitMode;
}

export interface PersonResult {
  member: Member;
  items: { item: MenuItem; portion: number; subtotal: number }[];
  subtotal: number;
  serviceShare: number;
  taxShare: number;
  discountShare: number;
  etcShare: number;
  total: number;
}
