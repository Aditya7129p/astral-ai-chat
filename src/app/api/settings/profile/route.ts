import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'node:crypto'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function validAvatar(value: unknown) {
  return value === null || (typeof value === 'string' && /^data:image\/(png|jpeg|jpg|webp);base64,/.test(value) && value.length <= 2_800_000)
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id }, select: { username: true, avatarDataUrl: true, profileToken: true, isPublic: true } })
  return NextResponse.json(profile ?? { username: user.user_metadata?.username ?? `astral-${user.id.slice(0, 6)}`, avatarDataUrl: user.user_metadata?.avatarDataUrl ?? null })
}

export async function PUT(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const avatarDataUrl = body?.avatarDataUrl === null ? null : body?.avatarDataUrl
  const isPublic = body?.isPublic === true
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return NextResponse.json({ error: 'Username must be 3-24 letters, numbers, or underscores.' }, { status: 400 })
  if (!validAvatar(avatarDataUrl)) return NextResponse.json({ error: 'Avatar must be a PNG, JPG, or WebP image under 2 MB.' }, { status: 400 })

  try {
    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, username, avatarDataUrl, isPublic, profileToken: isPublic ? randomBytes(18).toString('base64url') : null },
      update: { username, avatarDataUrl, isPublic, profileToken: isPublic ? undefined : null },
      select: { username: true, avatarDataUrl: true, profileToken: true, isPublic: true },
    })
    return NextResponse.json(profile)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 })
    throw error
  }
}