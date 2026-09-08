import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _anon: SupabaseClient | null = null;
let _admin: SupabaseClient | null = null;

export function hasSupabase() {
  return Boolean(url && anon);
}

export function supabase(): SupabaseClient | null {
  if (!url || !anon) return null;
  if (!_anon) _anon = createClient(url, anon, { auth: { persistSession: false } });
  return _anon;
}

export function supabaseAdmin(): SupabaseClient {
  if (!url || !service) {
    throw new Error("Supabase admin unavailable: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!_admin) _admin = createClient(url, service, { auth: { persistSession: false } });
  return _admin;
}
