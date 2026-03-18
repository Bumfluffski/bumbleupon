import { createClient } from "@supabase/supabase-js";

// Support both "NEXT_PUBLIC_*" (older/dev convention) and non-public server env vars.
// This keeps the API route working in more deployment setups.
// Supabase-js strongly types table/column names based on your Database types.
// Since this app doesn't ship generated Database types, we intentionally loosen
// them here so `supabase.from(...).insert(...)` type-checks at build time.
let cachedClient: ReturnType<typeof createClient<any, "public", any>> | null = null;

export function getSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Set SUPABASE_URL/SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local"
    );
  }

  if (!cachedClient) {
    cachedClient = createClient<any, "public", any>(supabaseUrl, supabaseAnonKey);
  }

  return cachedClient;
}