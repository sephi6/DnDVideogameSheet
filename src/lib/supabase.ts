import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
// La nomenclatura nueva de Supabase es «publishable key» (sb_publishable_…).
// Se acepta también el nombre antiguo VITE_SUPABASE_ANON_KEY por compatibilidad.
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()

/**
 * Si no hay credenciales la app sigue funcionando contra localStorage, sin
 * login. Así se puede clonar el repo y probarla sin montar nada.
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

/** Igual que `supabase` pero para los sitios donde ya sabemos que está configurado. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase no está configurado: falta .env.local con la URL y la publishable key')
  return supabase
}

/** Mensajes de error de Supabase traducidos a algo que se pueda leer en pantalla. */
export function readableError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const map: Record<string, string> = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'Email not confirmed': 'Falta confirmar el correo. Revisa tu bandeja de entrada.',
    'User already registered': 'Ese correo ya tiene cuenta. Entra en vez de registrarte.',
    'Password should be at least 6 characters': 'La contraseña necesita al menos 6 caracteres.',
    'Signup requires a valid password': 'Escribe una contraseña.',
    'Unable to validate email address: invalid format': 'Ese correo no tiene buena pinta.',
    'Email rate limit exceeded': 'Demasiados correos seguidos. Espera un poco.',
    'Failed to fetch': 'No se pudo contactar con Supabase. ¿Hay conexión? ¿La URL es correcta?',
  }
  for (const [needle, translated] of Object.entries(map)) {
    if (raw.includes(needle)) return translated
  }
  return raw
}
