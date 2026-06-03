import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://cgqatokqyufyvbrzfjdj.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_qdU9RaB16WpP1PK5c69m6g_oIa_kuXz";

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey);
