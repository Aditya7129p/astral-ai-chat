'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setStatus('')
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    const { error: authError } = await createClient().auth.updateUser({ password })
    if (authError) {
      setError(authError.message)
    } else {
      setStatus('Password updated.')
      window.setTimeout(() => router.push('/'), 800)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <span className="auth-icon">
          <KeyRound size={19} />
        </span>
        <p className="eyebrow">ASTRAL / SECURITY</p>
        <h1>Choose a new password.</h1>

        <form onSubmit={submit} className="auth-form">
          <label>
            New password
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label>
            Confirm password
            <div className="password-field">
              <input
                type={showConfirm ? 'text' : 'password'}
                minLength={6}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button type="submit">Update password</button>
        </form>

        {error && <p className="form-error">{error}</p>}
        {status && <p className="form-message">{status}</p>}
      </section>
    </main>
  )
}
