export type ProviderId = 'openrouter' | 'gemini' | 'groq' | 'openai' | 'custom'

export const PROVIDER_DEFAULTS: Record<Exclude<ProviderId, 'custom'>, { label: string; baseUrl: string }> = {
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  gemini: { label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
}

export function modelKey(provider: string, modelId: string) {
  return `${provider}:${modelId}`
}

export function splitModelKey(value: string) {
  const separator = value.indexOf(':')
  return separator === -1 ? { provider: 'openrouter', modelId: value } : { provider: value.slice(0, separator), modelId: value.slice(separator + 1) }
}

export function isSafeProviderUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    const hostname = url.hostname.toLowerCase()
    return hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '0.0.0.0' && !hostname.endsWith('.local') && !hostname.startsWith('10.') && !hostname.startsWith('192.168.') && !hostname.startsWith('169.254.')
  } catch {
    return false
  }
}