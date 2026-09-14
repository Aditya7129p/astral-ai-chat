import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { decryptApiKey } from '@/lib/api-key'
import { modelKey, PROVIDER_DEFAULTS } from '@/lib/providers'

type ModelOption = { id: string; name: string; provider: string; providerLabel: string; custom?: boolean }

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function fetchModels(provider: string, baseUrl: string, apiKey: string): Promise<ModelOption[]> {
  if (provider === 'gemini') {
    const response = await fetch(`${baseUrl}/models?key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(8000) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error?.message || 'Gemini model discovery failed.')
    return (data.models ?? []).filter((model: { supportedGenerationMethods?: string[] }) => model.supportedGenerationMethods?.includes('generateContent')).map((model: { name: string; displayName?: string }) => ({ id: modelKey('gemini', model.name.replace(/^models\//, '')), name: model.displayName || model.name.replace(/^models\//, ''), provider: 'gemini', providerLabel: 'Google Gemini' }))
  }
  const response = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || `${provider} model discovery failed.`)
  const available = (data.data ?? []).filter((model: { id?: string }) => model.id)
  const useful = provider === 'openrouter'
    ? available.filter((model: { id: string }) => model.id.endsWith(':free')).slice(0, 30)
    : provider === 'groq' ? available.slice(0, 20) : available.slice(0, 20)
  return useful.map((model: { id: string; name?: string }) => ({ id: modelKey(provider, model.id), name: model.name || model.id, provider, providerLabel: PROVIDER_DEFAULTS[provider as keyof typeof PROVIDER_DEFAULTS]?.label || provider }))
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const connections = await prisma.userProviderConnection.findMany({ where: { userId: user.id }, select: { id: true, provider: true, label: true, baseUrl: true, apiKeyEncrypted: true }, orderBy: { createdAt: 'desc' } })
  const legacyKey = await prisma.userProviderKey.findUnique({ where: { userId_provider: { userId: user.id, provider: 'openrouter' } }, select: { apiKeyEncrypted: true } })
  if (legacyKey && !connections.some((connection) => connection.provider === 'openrouter')) connections.push({ id: 'legacy-openrouter', provider: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', apiKeyEncrypted: legacyKey.apiKeyEncrypted })
  const models: ModelOption[] = []
  const errors: string[] = []
  const discovered = await Promise.all(connections.map(async (connection) => {
    try {
      return { models: (await fetchModels(connection.provider, connection.baseUrl, decryptApiKey(connection.apiKeyEncrypted))).map((model) => ({ ...model, providerLabel: connection.label })), error: '' }
    } catch (error) {
      return { models: [], error: error instanceof Error ? `${connection.label}: ${error.message}` : `${connection.label}: unavailable` }
    }
  }))
  discovered.forEach((result) => { models.push(...result.models); if (result.error) errors.push(result.error) })
  const customModels = await prisma.customModel.findMany({ where: { userId: user.id, enabled: true }, orderBy: { createdAt: 'desc' } })
  const connectionLabels = new Map(connections.map((connection) => [connection.id, connection.label]))
  models.unshift(...customModels.map((model) => { const owner = model.providerConnectionId ?? model.provider; return { id: modelKey(owner, model.modelId), name: model.name, provider: model.provider, providerLabel: connectionLabels.get(owner) ?? model.provider, custom: true } }))
  return NextResponse.json({ models, errors })
}