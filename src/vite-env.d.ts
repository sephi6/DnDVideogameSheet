/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** Nombre nuevo recomendado por Supabase (sb_publishable_…). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Nombre antiguo, aún admitido por compatibilidad. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /**
   * `'true'` muestra la pestaña «Crear cuenta» en el acceso. Cualquier otro valor
   * (o sin definir) la oculta: el alta de usuarios se gestiona desde Supabase.
   */
  readonly VITE_SIGNUPS_OPEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
