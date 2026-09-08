import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/controls'
import { play } from '@/lib/sfx'
import { useAuth } from '@/store/auth'

type Mode = 'signin' | 'signup'

/**
 * Sign-ups are managed from Supabase. The interface only offers "Create account"
 * if it is deliberately turned on with VITE_SIGNUPS_OPEN=true.
 */
const SIGNUPS_OPEN = import.meta.env.VITE_SIGNUPS_OPEN === 'true'

export function LoginScreen() {
  const { signIn, signUp, sendMagicLink, busy, error, notice, clearMessages } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    play('confirm')
    if (mode === 'signin' || !SIGNUPS_OPEN) await signIn(email, password)
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
          <span className="slab"><span>Sign in</span></span>
          <h1 className="display">Join the party</h1>
        </div>

        {SIGNUPS_OPEN && (
          <div className="row login-tabs">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                className="nav-item"
                data-active={mode === m}
                onClick={() => switchMode(m)}
              >
                <span>{m === 'signin' ? 'I have an account' : 'Create account'}</span>
              </button>
            ))}
          </div>
        )}

        <form className="stack" onSubmit={submit} style={{ gap: 12 }}>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </label>

          <label className="field">
            <span className="label">Password</span>
            <input
              className="input"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="at least 6 characters"
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
            <span>{busy ? 'One moment…' : mode === 'signin' ? 'Sign in ▸' : 'Create account ▸'}</span>
          </button>
        </form>

        <div className="login-alt">
          <span className="muted">Not in the mood for passwords?</span>
          <Button
            variant="small ghost"
            onClick={() => {
              if (email.trim()) void sendMagicLink(email)
            }}
          >
            Send me a link
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
