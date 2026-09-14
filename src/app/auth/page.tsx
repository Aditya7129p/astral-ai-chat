'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { profileColor, profileInitial } from '@/lib/profile'

export default function AuthPage() {
  const router = useRouter()

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [username, setUsername] = useState('')
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState('')
  const [resetRequested, setResetRequested] = useState(false)
  const [error, setError] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('error') || '',
  )
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Username availability check
  useEffect(() => {
    if (mode !== 'sign-up' || !username) return
    const timer = window.setTimeout(() => {
      fetch(`/api/auth/username?username=${encodeURIComponent(username)}`)
        .then((r) => r.json())
        .then((data) =>
          setUsernameStatus(
            !data.valid
              ? data.error
              : data.available
                ? 'Username is available.'
                : 'That username is already taken.',
          ),
        )
        .catch(() => setUsernameStatus('Could not validate username.'))
    }, 280)
    return () => window.clearTimeout(timer)
  }, [mode, username])

  function handleAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setError('Profile image must be under 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAvatarDataUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'sign-up') {
      if (usernameStatus !== 'Username is available.') {
        setError('Choose an available username before continuing.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)
    const supabase = createClient()

    const result =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
              data: { username, avatarDataUrl },
            },
          })

    if (result.error) {
      setError(result.error.message)
    } else if (mode === 'sign-up' && !result.data.session) {
      setMessage('Check your email to confirm your account.')
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  async function requestPasswordReset() {
    setError('')
    setMessage('')
    const result = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    })
    if (result.error) setError(result.error.message)
    else setResetRequested(true)
  }

  function switchMode() {
    setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirm(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">ASTRAL</p>
        <h1>{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-copy">Save every question and answer in your private history.</p>

        <form onSubmit={submit} className="auth-form">

          {/* ── Sign-up only fields ── */}
          {mode === 'sign-up' && (
            <>
              <label>
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  pattern="[A-Za-z0-9_]{3,24}"
                  minLength={3}
                  maxLength={24}
                  required
                  autoComplete="username"
                />
                <small
                  className={
                    usernameStatus === 'Username is available.'
                      ? 'validation-good'
                      : 'validation-note'
                  }
                >
                  {usernameStatus || 'Your public identity in Astral.'}
                </small>
              </label>

              {/* Avatar picker with circular preview */}
              <label>
                Profile picture
                <div className="avatar-pick-row">
                  <button
                    type="button"
                    className="avatar-pick-circle"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Choose profile picture"
                    style={
                      !avatarDataUrl
                        ? { background: profileColor(username || 'A') }
                        : undefined
                    }
                  >
                    {avatarDataUrl ? (
                      <img src={avatarDataUrl} alt="Preview" />
                    ) : (
                      <span>{profileInitial(username || 'A')}</span>
                    )}
                  </button>
                  <span className="avatar-pick-hint">
                    {avatarDataUrl ? 'Click to change' : 'Optional · PNG, JPG, WebP under 2 MB'}
                  </span>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatar}
                  style={{ display: 'none' }}
                />
              </label>
            </>
          )}

          {/* ── Email ── */}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          {/* ── Password ── */}
          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
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

          {/* ── Confirm password (sign-up only) ── */}
          {mode === 'sign-up' && (
            <label>
              Confirm password
              <div className="password-field">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        {/* Forgot password */}
        {mode === 'sign-in' && (
          <button
            className="mode-toggle"
            type="button"
            onClick={requestPasswordReset}
            disabled={!email}
          >
            {resetRequested ? 'Reset instructions sent' : 'Forgot your password?'}
          </button>
        )}

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-message">{message}</p>}

        <button className="mode-toggle" type="button" onClick={switchMode}>
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  )
}
