import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
// Supabase's new naming is "publishable key" (sb_publishable_…).
// The old name VITE_SUPABASE_ANON_KEY is still accepted for compatibility.
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()

/**
 * With no credentials the app keeps working against localStorage, with no
 * login. That way the repo can be cloned and tried out without setting up anything.
 */
export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** Same as `supabase`, but for the places where we already know it is configured. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured: .env.local with the URL and the publishable key is missing')
  return supabase
}

/** Supabase error messages turned into something readable on screen. */
export function readableError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const map: Record<string, string> = {
    'Invalid login credentials': 'Wrong email or password.',
    'Email not confirmed': 'The email is still unconfirmed. Check your inbox.',
    'User already registered': 'That email already has an account. Sign in instead of signing up.',
    'Password should be at least 6 characters': 'The password needs at least 6 characters.',
    'Signup requires a valid password': 'Type a password.',
    'Unable to validate email address: invalid format': "That email doesn't look right.",
    'Email rate limit exceeded': 'Too many emails in a row. Wait a moment.',
    'Failed to fetch': 'Could not reach Supabase. Is there a connection? Is the URL right?',
  }
  for (const [needle, readable] of Object.entries(map)) {
    if (raw.includes(needle)) return readable
  }
  return raw
}
