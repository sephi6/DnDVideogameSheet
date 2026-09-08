import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/controls'
import { play } from '@/lib/sfx'
import { useAuth } from '@/store/auth'

type Mode = 'entrar' | 'registro'

export function LoginScreen() {
  const { signIn, signUp, sendMagicLink, busy, error, notice, clearMessages } = useAuth()
  const [mode, setMode] = useState<Mode>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    play('confirm')
    if (mode === 'entrar') await signIn(email, password)
    else await signUp(email, password)
  }

  const switchMode = (next: Mode) => {
    play('move')
    clearMessages()
    setMode(next)
  }

  return (
    <div className="login-screen">
      <motion.div
        className="login-card panel"
        initial={{ opacity: 0, y: 40, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <div className="login-head">
          <span className="slab"><span>Acceso</span></span>
          <h1 className="display">Entra a la party</h1>
        </div>

        <div className="row login-tabs">
          {(['entrar', 'registro'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              className="nav-item"
              data-active={mode === m}
              onClick={() => switchMode(m)}
            >
              <span>{m === 'entrar' ? 'Ya tengo cuenta' : 'Crear cuenta'}</span>
            </button>
          ))}
        </div>

        <form className="stack" onSubmit={submit} style={{ gap: 12 }}>
          <label className="field">
            <span className="label">Correo</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </label>

          <label className="field">
            <span className="label">Contraseña</span>
            <input
              className="input"
              type="password"
              autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
            />
          </label>

          {error && (
            <motion.p
              className="login-error"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              role="alert"
            >
              {error}
            </motion.p>
          )}
          {notice && (
            <motion.p className="login-notice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status">
              {notice}
            </motion.p>
          )}

          <button type="submit" className="btn login-submit" disabled={busy}>
            <span>{busy ? 'Un momento…' : mode === 'entrar' ? 'Entrar ▸' : 'Crear cuenta ▸'}</span>
          </button>
        </form>

        <div className="login-alt">
          <span className="muted">¿Sin ganas de contraseñas?</span>
          <Button
            variant="small ghost"
            onClick={() => {
              if (email.trim()) void sendMagicLink(email)
            }}
          >
            Enviarme un enlace
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
