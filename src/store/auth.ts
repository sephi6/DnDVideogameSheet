import { create } from 'zustand'
import { isSupabaseConfigured, readableError, supabase } from '@/lib/supabase'

export type AuthStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in'

export interface AuthUser {
  id: string
  email: string
}

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  error: string | null
  /** Aviso informativo, p. ej. «te hemos enviado un enlace». */
  notice: string | null
  busy: boolean
  init: () => () => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  clearMessages: () => void
}

export const useAuth = create<AuthState>((set) => ({
  status: isSupabaseConfigured ? 'loading' : 'disabled',
  user: null,
  error: null,
  notice: null,
  busy: false,

  /** Lee la sesión guardada y se queda escuchando los cambios. */
  init() {
    if (!supabase) {
      set({ status: 'disabled' })
      return () => {}
    }

    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      set(
        user
          ? { status: 'signed-in', user: { id: user.id, email: user.email ?? '' } }
          : { status: 'signed-out', user: null },
      )
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      set(
        user
          ? { status: 'signed-in', user: { id: user.id, email: user.email ?? '' }, error: null, notice: null }
          : { status: 'signed-out', user: null },
      )
    })

    return () => sub.subscription.unsubscribe()
  },

  async signIn(email, password) {
    if (!supabase) return
    set({ busy: true, error: null, notice: null })
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    set({ busy: false, error: error ? readableError(error) : null })
  },

  async signUp(email, password) {
    if (!supabase) return
    set({ busy: true, error: null, notice: null })
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error) {
      set({ busy: false, error: readableError(error) })
      return
    }
    // Con la confirmación por correo activada no hay sesión hasta que se pulsa el enlace.
    set({
      busy: false,
      notice: data.session ? null : 'Cuenta creada. Confirma el correo y vuelve a entrar.',
    })
  },

  async sendMagicLink(email) {
    if (!supabase) return
    set({ busy: true, error: null, notice: null })
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    set({
      busy: false,
      error: error ? readableError(error) : null,
      notice: error ? null : 'Te hemos enviado un enlace de acceso. Revisa el correo.',
    })
  },

  async signOut() {
    if (!supabase) return
    set({ busy: true })
    await supabase.auth.signOut()
    set({ busy: false, status: 'signed-out', user: null, error: null, notice: null })
  },

  clearMessages() {
    set({ error: null, notice: null })
  },
}))
