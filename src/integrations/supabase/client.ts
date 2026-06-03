import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://cgqatokqyufyvbrzfjdj.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncWF0b2txeXVmeXZicnpmamRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTYwMDcsImV4cCI6MjA5NDg5MjAwN30.2tdlgOBIc25lKMZKGddNOZZHTyy4--0v4ajMw7-VGj8";

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey);
