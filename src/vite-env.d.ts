/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** Nombre nuevo recomendado por Supabase (sb_publishable_…). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Nombre antiguo, aún admitido por compatibilidad. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
