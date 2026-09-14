import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_MODEL } from '@/lib/models'
import { decryptApiKey } from '@/lib/api-key'
import { splitModelKey } from '@/lib/providers'

type TextPart = { type: 'text'; text: string }
type ImagePart = { type: 'image_url'; image_url: { url: string } }
type FilePart = { type: 'file'; file: { filename: string; file_data: string } }
type MessageContent = string | Array<TextPart | ImagePart | FilePart>
type ChatMessage = { role: 'user' | 'assistant'; content: MessageContent }

function isMessageContent(value: unknown): value is MessageContent {
  if (typeof value === 'string') return value.length <= 100_000
  if (!Array.isArray(value) || value.length > 6) return false
  return value.every((part) => {
    if (typeof part !== 'object' || part === null) return false
    const candidate = part as Record<string, unknown>
    if (candidate.type === 'text') return typeof candidate.text === 'string' && candidate.text.length <= 100_000
    if (candidate.type === 'image_url') {
      const imageUrl = candidate.image_url as Record<string, unknown> | undefined
      return typeof imageUrl?.url === 'string' && imageUrl.url.startsWith('data:image/') && imageUrl.url.length <= 12_000_000
    }
    if (candidate.type === 'file') {
      const file = candidate.file as Record<string, unknown> | undefined
      return typeof file?.filename === 'string' && file.filename.length <= 200 && typeof file.file_data === 'string' && file.file_data.startsWith('data:application/pdf;base64,') && file.file_data.length <= 12_000_000
    }
    return false
  })
}

function getQuestionText(content: MessageContent) {
  if (typeof content === 'string') return content.trim()
  const text = content.filter((part): part is TextPart => part.type === 'text').map((part) => part.text.trim()).filter(Boolean).join('\n')
  const files = content.filter((part): part is FilePart => part.type === 'file').map((part) => part.file.filename)
  const images = content.filter((part): part is ImagePart => part.type === 'image_url').length
  return [text, ...files.map((filename) => `[Attached PDF: ${filename}]`), ...(images ? [`[Attached image${images > 1 ? 's' : ''}: ${images}]`] : [])].filter(Boolean).join('\n')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const body = await request.json()
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  const rawMessages: unknown[] = Array.isArray(body.messages) ? body.messages : []
  const messages = rawMessages
    .filter((message: unknown): message is ChatMessage => {
      if (typeof message !== 'object' || message === null) return false
      const candidate = message as Record<string, unknown>
      return (candidate.role === 'user' || candidate.role === 'assistant') && isMessageContent(candidate.content)
    })
    .map(({ role, content }) => ({ role, content }))
  const rawModel = typeof body.model === 'string' ? body.model : `openrouter:${DEFAULT_MODEL}`
  const { modelId: requestedModel } = splitModelKey(rawModel)
  let { provider } = splitModelKey(rawModel)
  const savedAlias = await prisma.customModel.findFirst({ where: { userId: user.id, modelId: requestedModel }, select: { provider: true, providerConnectionId: true } })
  if (savedAlias) {
    provider = savedAlias.providerConnectionId ?? savedAlias.provider.toLowerCase()
    if (provider === 'custom') {
      const fallbackConnection = await prisma.userProviderConnection.findFirst({ where: { userId: user.id, provider: { in: ['groq', 'gemini', 'openai', 'openrouter'] } }, orderBy: { createdAt: 'desc' }, select: { provider: true } })
      if (fallbackConnection) provider = fallbackConnection.provider
    }
  }
  const question = messages.at(-1)

  const questionText = question ? getQuestionText(question.content) : ''
  if (!question || question.role !== 'user' || !questionText) {
    return NextResponse.json({ error: 'A question is required.' }, { status: 400 })
  }

  const session = sessionId
    ? await prisma.chatSession.findFirst({ where: { id: sessionId, userId: user.id }, select: { id: true } })
    : await prisma.chatSession.create({ data: { userId: user.id, title: questionText.slice(0, 90) }, select: { id: true } })
  if (!session) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })

  const connection = await prisma.userProviderConnection.findFirst({ where: { userId: user.id, OR: [{ id: provider }, { provider }] }, select: { provider: true, baseUrl: true, apiKeyEncrypted: true } })
  const providerType = connection?.provider ?? provider
  const legacyKey = providerType === 'openrouter' ? await prisma.userProviderKey.findUnique({ where: { userId_provider: { userId: user.id, provider: providerType } }, select: { apiKeyEncrypted: true } }) : null
  if (!connection && !legacyKey) return NextResponse.json({ error: `Add a ${provider} API key in Settings before sending a message.` }, { status: 400 })

  let apiKey: string
  try {
    apiKey = decryptApiKey(connection?.apiKeyEncrypted ?? legacyKey!.apiKeyEncrypted)
  } catch {
    return NextResponse.json({ error: 'Your saved OpenRouter API key could not be read. Please save it again in Settings.' }, { status: 500 })
  }

  const startedAt = performance.now()
  const baseUrl = connection?.baseUrl ?? 'https://openrouter.ai/api/v1'
  const isGemini = providerType === 'gemini'
  const endpoint = isGemini ? `${baseUrl}/models/${encodeURIComponent(requestedModel)}:generateContent?key=${encodeURIComponent(apiKey)}` : `${baseUrl}/chat/completions`
  const openAiMessages = messages.map((item) => ({ role: item.role, content: item.content }))
  const geminiContents = messages.map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: typeof item.content === 'string' ? [{ text: item.content }] : item.content.map((part) => part.type === 'text' ? { text: part.text } : part.type === 'image_url' ? { inlineData: { mimeType: part.image_url.url.slice(5, part.image_url.url.indexOf(';')), data: part.image_url.url.split(',')[1] } } : { text: `[Attached file: ${part.file.filename}]` }) }))
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...(isGemini ? {} : { Authorization: `Bearer ${apiKey}` }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(isGemini ? { contents: geminiContents } : { model: requestedModel, messages: openAiMessages }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return NextResponse.json({ error: data.error?.message || data.message || `${provider} request failed` }, { status: response.status })
  }

  const message = isGemini ? (() => { const parts = data.candidates?.[0]?.content?.parts ?? []; const text = parts.filter((part: { text?: unknown }) => typeof part.text === 'string').map((part: { text: string }) => part.text).join('\n'); const imageParts = parts.filter((part: { inlineData?: { mimeType?: string; data?: string } }) => part.inlineData?.data).map((part: { inlineData: { mimeType?: string; data?: string } }) => ({ type: 'image_url', image_url: { url: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}` } })); return imageParts.length ? [...(text ? [{ type: 'text', text }] : []), ...imageParts] : text })() : data.choices?.[0]?.message?.content
  const isStructuredContent = Array.isArray(message) && message.every((part: unknown) => typeof part === 'object' && part !== null)
  if (typeof message !== 'string' && !isStructuredContent) {
    return NextResponse.json({ error: 'OpenRouter returned an empty response.' }, { status: 502 })
  }

  const usage = data.usage ?? {}
  const latencyMs = Math.round(performance.now() - startedAt)
  const reasoningTokens = typeof usage.reasoning_tokens === 'number'
    ? usage.reasoning_tokens
    : typeof usage.completion_tokens_details?.reasoning_tokens === 'number'
      ? usage.completion_tokens_details.reasoning_tokens
      : null
  const responseModel = typeof data.model === 'string' ? data.model : requestedModel
  await prisma.chatMessage.create({ data: { sessionId: session.id, role: 'user', contentJson: JSON.stringify(question.content) } })
  const assistantMessage = await prisma.chatMessage.create({ data: { sessionId: session.id, role: 'assistant', contentJson: JSON.stringify(message), model: responseModel, latencyMs, usageJson: JSON.stringify(usage) } })
  await prisma.chatSession.update({ where: { id: session.id }, data: { model: responseModel, title: questionText.slice(0, 90) } })
  const savedQuestion = await prisma.question.create({
    data: {
      userId: user.id,
      question: questionText,
      response: typeof message === 'string' ? message : JSON.stringify(message),
      model: responseModel,
      latencyMs,
      promptTokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : null,
      completionTokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : null,
      reasoningTokens,
      totalTokens: typeof usage.total_tokens === 'number' ? usage.total_tokens : null,
    },
  })

  return NextResponse.json({ sessionId: session.id, id: assistantMessage.id, legacyId: savedQuestion.id, message, model: responseModel, latencyMs, usage })
}
