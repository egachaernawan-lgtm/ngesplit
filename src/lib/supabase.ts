import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Bill } from "@/types/bill";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || url === "your_supabase_project_url") {
      throw new Error("Supabase env vars not configured.");
    }
    _client = createClient(url, key);
  }
  return _client;
}

export async function saveBill(bill: Bill): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await getClient()
      .from("bills")
      .upsert({ id: bill.id, data: bill, updated_at: new Date().toISOString() });
    if (error) {
      console.error("[saveBill] Supabase error:", error.message, error.code);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[saveBill] Unexpected error:", msg);
    return { ok: false, error: msg };
  }
}

export async function loadBill(id: string): Promise<Bill | null> {
  try {
    const { data, error } = await getClient()
      .from("bills")
      .select("data")
      .eq("id", id)
      .single();
    if (error) {
      // PGRST116 = no rows found — expected when bill doesn't exist
      if (error.code !== "PGRST116") {
        console.error("[loadBill] Supabase error:", error.message, error.code);
      }
      return null;
    }
    return data?.data as Bill ?? null;
  } catch (e) {
    console.error("[loadBill] Unexpected error:", e);
    return null;
  }
}
