/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** New name recommended by Supabase (sb_publishable_…). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Old name, still accepted for compatibility. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /**
   * `'true'` shows the "Create account" tab on the sign-in screen. Any other
   * value (or leaving it undefined) hides it: sign-ups are managed from Supabase.
   */
  readonly VITE_SIGNUPS_OPEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
