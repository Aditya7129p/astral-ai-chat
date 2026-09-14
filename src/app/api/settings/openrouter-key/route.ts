import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { encryptApiKey } from '@/lib/api-key'

const PROVIDER = 'openrouter'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const setting = await prisma.userProviderKey.findUnique({
    where: { userId_provider: { userId: user.id, provider: PROVIDER } },
    select: { updatedAt: true },
  })

  return NextResponse.json({ configured: Boolean(setting), updatedAt: setting?.updatedAt ?? null })
}

export async function PUT(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
  if (!apiKey || apiKey.length > 500) {
    return NextResponse.json({ error: 'Enter a valid OpenRouter API key.' }, { status: 400 })
  }

  try {
    await prisma.userProviderKey.upsert({
      where: { userId_provider: { userId: user.id, provider: PROVIDER } },
      create: { userId: user.id, provider: PROVIDER, apiKeyEncrypted: encryptApiKey(apiKey) },
      update: { apiKeyEncrypted: encryptApiKey(apiKey) },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('ASTRAL_ENCRYPTION_KEY')) {
      return NextResponse.json({ error: 'Server encryption is not configured. Add ASTRAL_ENCRYPTION_KEY.' }, { status: 500 })
    }
    throw error
  }

  return NextResponse.json({ configured: true })
}

export async function DELETE() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  await prisma.userProviderKey.deleteMany({ where: { userId: user.id, provider: PROVIDER } })
  return NextResponse.json({ configured: false })
}