import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Public anon client. It can only invoke edge functions: tables have RLS on with no policies.
export const supabase = createClient(url, key);
