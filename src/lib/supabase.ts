import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// When env vars are missing we export null so callers can show a graceful
// "auth not configured" message instead of crashing the app.
export const supabase = url && key ? createClient(url, key) : null;

export const isSupabaseConfigured = Boolean(url && key);
