import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Bill } from "@/types/bill";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || url === "your_supabase_project_url") {
      throw new Error("Supabase environment variables are not configured.");
    }
    _client = createClient(url, key);
  }
  return _client;
}

export async function saveBill(bill: Bill): Promise<void> {
  const { error } = await getClient()
    .from("bills")
    .upsert({ id: bill.id, data: bill, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function loadBill(id: string): Promise<Bill | null> {
  const { data, error } = await getClient()
    .from("bills")
    .select("data")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data.data as Bill;
}
