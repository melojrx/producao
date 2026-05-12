import { createBrowserClient } from '@supabase/ssr'
import { createSupabaseFetch } from '@/lib/supabase/fetch'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: createSupabaseFetch(),
      },
    }
  )
}
