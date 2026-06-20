import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  if (typeof window !== 'undefined') {
    if (browserClient) return browserClient;
    browserClient = createBrowserClient(supabaseUrl, supabaseKey);
    return browserClient;
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
