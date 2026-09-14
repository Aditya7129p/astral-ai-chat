'use client'

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  KeyRound,
  Mail,
  Pause,
  Pencil,
  Play,
  Plus,
  Save,
  Share2,
  Trash2,
  UserRound,
  PlugZap,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { profileColor, profileInitial, type Profile } from '@/lib/profile'

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomModel = {
  id: string
  modelId: string
  name: string
  provider: string
  providerConnectionId?: string | null
  enabled: boolean
}

type ProviderConnection = {
  id: string
  provider: string
  label: string
  baseUrl: string
}

// Inline edit state shapes
type EditingModel = {
  id: string
  name: string
  modelId: string
  providerConnectionId: string
}

type EditingProvider = {
  id: string
  label: string
  baseUrl: string
  apiKey: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Profile
  const [username, setUsername] = useState('')
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // Lists
  const [models, setModels] = useState<CustomModel[]>([])
  const [providers, setProviders] = useState<ProviderConnection[]>([])

  // Add-provider form
  const [provider, setProvider] = useState('gemini')
  const [providerLabel, setProviderLabel] = useState('My Gemini')
  const [providerKey, setProviderKey] = useState('')
  const [providerBaseUrl, setProviderBaseUrl] = useState('')

  // Add-model form
  const [modelId, setModelId] = useState('')
  const [modelName, setModelName] = useState('')
  const [modelProvider, setModelProvider] = useState('')

  // Inline edit states (null = not editing)
  const [editingModel, setEditingModel] = useState<EditingModel | null>(null)
  const [editingProvider, setEditingProvider] = useState<EditingProvider | null>(null)

  // Feedback
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  // ─── Load on mount ──────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/profile'),
      fetch('/api/settings/models'),
      fetch('/api/settings/providers'),
      createClient().auth.getUser(),
    ])
      .then(async ([profileRes, modelsRes, providersRes, authResult]) => {
        if (profileRes.ok) {
          const data = await profileRes.json() as Profile
          setUsername(data.username)
          setAvatarDataUrl(data.avatarDataUrl)
        }
        if (modelsRes.ok) setModels(await modelsRes.json())
        if (providersRes.ok) setProviders(await providersRes.json())
        setEmail(authResult.data.user?.email ?? '')
      })
      .catch(() => setError('Could not load settings.'))
  }, [])

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function clearFeedback() { setStatus(''); setError('') }
  function fail(msg: string) { setError(msg); setStatus('') }
  function succeed(msg: string) { setStatus(msg); setError('') }

  // ─── Profile ────────────────────────────────────────────────────────────────

  function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      fail('Profile image must be under 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAvatarDataUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    clearFeedback()
    const response = await fetch('/api/settings/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, avatarDataUrl }),
    })
    const data = await response.json()
    if (!response.ok) { fail(data.error); return }
    setUsername(data.username)
    succeed('Profile updated.')
  }

  async function shareProfile() {
    clearFeedback()
    const response = await fetch('/api/profile/share', { method: 'POST' })
    const data = await response.json()
    if (!response.ok) { fail(data.error); return }
    await navigator.clipboard.writeText(data.url)
    succeed('Public profile link copied.')
  }

  // ─── Providers — add ────────────────────────────────────────────────────────

  async function saveProvider(event: FormEvent) {
    event.preventDefault()
    clearFeedback()
    const response = await fetch('/api/settings/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        label: providerLabel,
        apiKey: providerKey,
        baseUrl: providerBaseUrl || undefined,
      }),
    })
    const data = await response.json()
    if (!response.ok) { fail(data.error); return }
    setProviders((current) => [data, ...current.filter((item) => item.id !== data.id)])
    setProviderKey('')
    succeed(`${providerLabel} connected.`)
  }

  // ─── Providers — edit ───────────────────────────────────────────────────────

  function startEditProvider(item: ProviderConnection) {
    setEditingProvider({ id: item.id, label: item.label, baseUrl: item.baseUrl, apiKey: '' })
    setEditingModel(null)
  }

  async function saveEditProvider(event: FormEvent) {
    event.preventDefault()
    if (!editingProvider) return
    clearFeedback()
    const body: Record<string, string> = { id: editingProvider.id }
    if (editingProvider.label) body.label = editingProvider.label
    if (editingProvider.baseUrl) body.baseUrl = editingProvider.baseUrl
    if (editingProvider.apiKey) body.apiKey = editingProvider.apiKey

    const response = await fetch('/api/settings/providers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) { fail(data.error); return }
    setProviders((current) =>
      current.map((item) => (item.id === data.id ? data : item)),
    )
    setEditingProvider(null)
    succeed('Provider updated.')
  }

  // ─── Providers — remove ─────────────────────────────────────────────────────

  async function removeProvider(id: string) {
    clearFeedback()
    await fetch(`/api/settings/providers?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setProviders((current) => current.filter((item) => item.id !== id))
    succeed('Provider removed.')
  }

  // ─── Models — add ───────────────────────────────────────────────────────────

  async function addModel(event: FormEvent) {
    event.preventDefault()
    clearFeedback()
    const response = await fetch('/api/settings/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, name: modelName, providerConnectionId: modelProvider }),
    })
    const data = await response.json()
    if (!response.ok) { fail(data.error); return }
    setModels((current) => [data, ...current])
    setModelId('')
    setModelName('')
    succeed('Custom model added.')
  }

  // ─── Models — edit ──────────────────────────────────────────────────────────

  function startEditModel(model: CustomModel) {
    setEditingModel({
      id: model.id,
      name: model.name,
      modelId: model.modelId,
      providerConnectionId: model.providerConnectionId ?? '',
    })
    setEditingProvider(null)
  }

  async function saveEditModel(event: FormEvent) {
    event.preventDefault()
    if (!editingModel) return
    clearFeedback()
    const response = await fetch('/api/settings/models', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingModel.id,
        name: editingModel.name,
        modelId: editingModel.modelId,
        providerConnectionId: editingModel.providerConnectionId || undefined,
      }),
    })
    const data = await response.json()
    if (!response.ok) { fail(data.error); return }
    setModels((current) =>
      current.map((m) => (m.id === data.id ? { ...m, ...data } : m)),
    )
    setEditingModel(null)
    succeed('Model updated.')
  }

  // ─── Models — toggle enabled ─────────────────────────────────────────────────

  async function toggleModel(model: CustomModel) {
    clearFeedback()
    const response = await fetch('/api/settings/models', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: model.id, enabled: !model.enabled }),
    })
    const data = await response.json()
    if (!response.ok) { fail(data.error); return }
    setModels((current) =>
      current.map((m) => (m.id === data.id ? { ...m, enabled: data.enabled } : m)),
    )
    succeed(data.enabled ? 'Model enabled.' : 'Model paused.')
  }

  // ─── Models — remove ────────────────────────────────────────────────────────

  async function removeModel(id: string) {
    clearFeedback()
    await fetch(`/api/settings/models?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setModels((current) => current.filter((m) => m.id !== id))
    succeed('Custom model removed.')
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────

  async function requestPasswordReset() {
    clearFeedback()
    if (!email) return
    const { error: authError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    })
    if (authError) fail(authError.message)
    else succeed('Password reset instructions sent to your email.')
  }

  async function changeEmail(event: FormEvent) {
    event.preventDefault()
    clearFeedback()
    const { error: authError } = await createClient().auth.updateUser({ email: newEmail })
    if (authError) fail(authError.message)
    else { setNewEmail(''); succeed('Check both email addresses to confirm the change.') }
  }

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <main className="settings-page">
      <header className="settings-top">
        <Link href="/"><ArrowLeft size={16} /> Back to chat</Link>
        <p className="brand-lockup">ASTRAL / SETTINGS</p>
      </header>

      <div className="settings-title">
        <p className="eyebrow">ACCOUNT CONTROL</p>
        <h1>Make Astral yours.</h1>
        <p>Connect providers, curate models, and manage your account securely.</p>
      </div>

      <div className="settings-grid">

        {/* ── Provider connections ─────────────────────────────────────────── */}
        <section className="settings-card settings-wide">
          <div className="settings-card-title">
            <PlugZap size={18} />
            <div>
              <h2>Provider connections</h2>
              <p>Use your own Gemini, Groq, OpenAI, OpenRouter, or custom provider credits.</p>
            </div>
          </div>

          {/* Add form */}
          <form onSubmit={saveProvider} className="provider-form">
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom provider</option>
            </select>
            <input
              value={providerLabel}
              onChange={(e) => setProviderLabel(e.target.value)}
              placeholder="Connection name"
              required
            />
            <input
              type="password"
              value={providerKey}
              onChange={(e) => setProviderKey(e.target.value)}
              placeholder="API key"
              required
            />
            <input
              value={providerBaseUrl}
              onChange={(e) => setProviderBaseUrl(e.target.value)}
              placeholder="Custom HTTPS URL (optional)"
            />
            <button type="submit" aria-label="Connect provider">
              <Plus size={16} />
            </button>
          </form>

          {/* Connection list */}
          <div className="connection-list">
            {providers.map((item) =>
              editingProvider?.id === item.id ? (
                /* ── Inline edit row ── */
                <form
                  key={item.id}
                  className="connection-edit-form"
                  onSubmit={saveEditProvider}
                >
                  <div className="connection-edit-fields">
                    <input
                      value={editingProvider.label}
                      onChange={(e) =>
                        setEditingProvider((prev) => prev && { ...prev, label: e.target.value })
                      }
                      placeholder="Connection name"
                      required
                    />
                    <input
                      value={editingProvider.baseUrl}
                      onChange={(e) =>
                        setEditingProvider((prev) => prev && { ...prev, baseUrl: e.target.value })
                      }
                      placeholder="Base URL"
                    />
                    <input
                      type="password"
                      value={editingProvider.apiKey}
                      onChange={(e) =>
                        setEditingProvider((prev) => prev && { ...prev, apiKey: e.target.value })
                      }
                      placeholder="New API key (leave blank to keep current)"
                    />
                  </div>
                  <div className="connection-edit-actions">
                    <button type="submit" aria-label="Save changes">
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel"
                      onClick={() => setEditingProvider(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </form>
              ) : (
                /* ── Normal row ── */
                <div key={item.id}>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.provider} · {item.baseUrl}</small>
                  </span>
                  <div className="connection-row-actions">
                    <button
                      type="button"
                      onClick={() => startEditProvider(item)}
                      aria-label={`Edit ${item.label}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProvider(item.id)}
                      aria-label={`Remove ${item.label}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-title">
            <UserRound size={18} />
            <div>
              <h2>Profile</h2>
              <p>Visible identity and public sharing.</p>
            </div>
          </div>
          <div className="profile-preview">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="Profile preview" />
            ) : (
              <span style={{ backgroundColor: profileColor(username || 'Astral') }}>
                {profileInitial(username || 'Astral')}
              </span>
            )}
            <label className="file-label">
              Choose picture
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatar} />
            </label>
          </div>
          <form onSubmit={saveProfile} className="stack-form">
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <button type="submit"><Save size={15} /> Save profile</button>
          </form>
          <button className="secondary-action" type="button" onClick={shareProfile}>
            <Share2 size={15} /> Copy public profile link
          </button>
        </section>

        {/* ── Password ─────────────────────────────────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-title">
            <KeyRound size={18} />
            <div>
              <h2>Password</h2>
              <p>Send a secure reset link to your email.</p>
            </div>
          </div>
          <button className="secondary-action" type="button" onClick={requestPasswordReset}>
            <KeyRound size={15} /> Send reset email
          </button>
        </section>

        {/* ── Email ────────────────────────────────────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-title">
            <Mail size={18} />
            <div>
              <h2>Email address</h2>
              <p>Current: {email || 'Loading...'}</p>
            </div>
          </div>
          <form onSubmit={changeEmail} className="stack-form">
            <label>
              New email
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
                required
              />
            </label>
            <button type="submit"><Mail size={15} /> Change email</button>
          </form>
        </section>

        {/* ── Custom models ────────────────────────────────────────────────── */}
        <section className="settings-card settings-wide">
          <div className="settings-card-title">
            <Plus size={18} />
            <div>
              <h2>Custom model aliases</h2>
              <p>
                Choose the connected provider that owns this model. Aliases appear first in chat.
                Pause a model to hide it from the picker without deleting it.
              </p>
            </div>
          </div>

          {/* Add form */}
          <form onSubmit={addModel} className="model-form">
            <input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Display name"
              required
            />
            <input
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="organization/model"
              required
            />
            <select
              value={modelProvider}
              onChange={(e) => setModelProvider(e.target.value)}
              required
            >
              <option value="" disabled>Provider connection</option>
              {providers.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.label} · {connection.provider}
                </option>
              ))}
            </select>
            <button type="submit" aria-label="Add custom model" disabled={!modelProvider}>
              <Plus size={16} />
            </button>
          </form>

          {/* Model list */}
          <div className="connection-list">
            {models.map((model) =>
              editingModel?.id === model.id ? (
                /* ── Inline edit row ── */
                <form
                  key={model.id}
                  className="connection-edit-form"
                  onSubmit={saveEditModel}
                >
                  <div className="connection-edit-fields">
                    <input
                      value={editingModel.name}
                      onChange={(e) =>
                        setEditingModel((prev) => prev && { ...prev, name: e.target.value })
                      }
                      placeholder="Display name"
                      required
                    />
                    <input
                      value={editingModel.modelId}
                      onChange={(e) =>
                        setEditingModel((prev) => prev && { ...prev, modelId: e.target.value })
                      }
                      placeholder="organization/model"
                      required
                    />
                    <select
                      value={editingModel.providerConnectionId}
                      onChange={(e) =>
                        setEditingModel((prev) => prev && { ...prev, providerConnectionId: e.target.value })
                      }
                    >
                      <option value="">Keep current provider</option>
                      {providers.map((connection) => (
                        <option key={connection.id} value={connection.id}>
                          {connection.label} · {connection.provider}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="connection-edit-actions">
                    <button type="submit" aria-label="Save changes">
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel"
                      onClick={() => setEditingModel(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </form>
              ) : (
                /* ── Normal row ── */
                <div key={model.id} className={model.enabled ? '' : 'connection-row-paused'}>
                  <span>
                    <strong>{model.name}</strong>
                    <small>
                      {model.modelId} · {model.provider}
                      {!model.enabled && ' · paused'}
                    </small>
                  </span>
                  <div className="connection-row-actions">
                    <button
                      type="button"
                      onClick={() => startEditModel(model)}
                      aria-label={`Edit ${model.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleModel(model)}
                      aria-label={model.enabled ? `Pause ${model.name}` : `Enable ${model.name}`}
                      title={model.enabled ? 'Pause (hide from chat)' : 'Enable'}
                    >
                      {model.enabled ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeModel(model.id)}
                      aria-label={`Remove ${model.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      </div>

      {status && <p className="settings-status">{status}</p>}
      {error && <p className="settings-error" role="alert">{error}</p>}
    </main>
  )
}
