export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseIDR(value: string): number {
  return parseInt(value.replace(/[^\d-]/g, ""), 10) || 0;
}
