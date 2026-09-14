import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { encryptApiKey } from '@/lib/api-key'
import { isSafeProviderUrl, PROVIDER_DEFAULTS } from '@/lib/providers'

async function getUser() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const providers = await prisma.userProviderConnection.findMany({
    where: { userId: user.id },
    select: { id: true, provider: true, label: true, baseUrl: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(providers)
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const provider = typeof body?.provider === 'string' ? body.provider.trim().toLowerCase() : ''
  const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 60) : ''
  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
  const defaultConfig = provider in PROVIDER_DEFAULTS
    ? PROVIDER_DEFAULTS[provider as keyof typeof PROVIDER_DEFAULTS]
    : null
  const baseUrl = typeof body?.baseUrl === 'string'
    ? body.baseUrl.trim().replace(/\/$/, '')
    : defaultConfig?.baseUrl ?? ''

  if (
    !['openrouter', 'gemini', 'groq', 'openai', 'custom'].includes(provider) ||
    !label || !apiKey || !isSafeProviderUrl(baseUrl)
  ) {
    return NextResponse.json(
      { error: 'Provider, label, and a public HTTPS base URL are required.' },
      { status: 400 },
    )
  }
  if (apiKey.length > 500 || baseUrl.length > 300) {
    return NextResponse.json({ error: 'Provider details are too long.' }, { status: 400 })
  }

  try {
    const connection = await prisma.userProviderConnection.upsert({
      where: { userId_provider_label: { userId: user.id, provider, label } },
      create: { userId: user.id, provider, label, baseUrl, apiKeyEncrypted: encryptApiKey(apiKey) },
      update: { baseUrl, apiKeyEncrypted: encryptApiKey(apiKey) },
      select: { id: true, provider: true, label: true, baseUrl: true, updatedAt: true },
    })
    return NextResponse.json(connection)
  } catch (error) {
    if (error instanceof Error && error.message.includes('ASTRAL_ENCRYPTION_KEY')) {
      return NextResponse.json({ error: 'Server encryption is not configured.' }, { status: 500 })
    }
    throw error
  }
}

export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'Provider ID is required.' }, { status: 400 })

  // Verify ownership
  const existing = await prisma.userProviderConnection.findFirst({
    where: { id, userId: user.id },
    select: { id: true, provider: true, label: true, baseUrl: true },
  })
  if (!existing) return NextResponse.json({ error: 'Provider not found.' }, { status: 404 })

  const data: Record<string, unknown> = {}

  if (typeof body?.label === 'string') {
    const label = body.label.trim().slice(0, 60)
    if (!label) return NextResponse.json({ error: 'Label cannot be empty.' }, { status: 400 })
    data.label = label
  }

  if (typeof body?.baseUrl === 'string') {
    const baseUrl = body.baseUrl.trim().replace(/\/$/, '')
    if (!isSafeProviderUrl(baseUrl)) {
      return NextResponse.json({ error: 'Base URL must be a public HTTPS address.' }, { status: 400 })
    }
    if (baseUrl.length > 300) return NextResponse.json({ error: 'Base URL is too long.' }, { status: 400 })
    data.baseUrl = baseUrl
  }

  if (typeof body?.apiKey === 'string') {
    const apiKey = body.apiKey.trim()
    if (apiKey.length > 500) return NextResponse.json({ error: 'API key is too long.' }, { status: 400 })
    if (apiKey) data.apiKeyEncrypted = encryptApiKey(apiKey)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  try {
    const updated = await prisma.userProviderConnection.update({
      where: { id },
      data,
      select: { id: true, provider: true, label: true, baseUrl: true, updatedAt: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A connection with that label already exists.' }, { status: 409 })
    }
    if (error instanceof Error && error.message.includes('ASTRAL_ENCRYPTION_KEY')) {
      return NextResponse.json({ error: 'Server encryption is not configured.' }, { status: 500 })
    }
    throw error
  }
}

export async function DELETE(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Provider connection is required.' }, { status: 400 })
  await prisma.userProviderConnection.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ deleted: true })
}
