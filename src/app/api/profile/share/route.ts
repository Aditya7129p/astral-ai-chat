import { randomBytes } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const token = randomBytes(18).toString('base64url')
  const updated = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      username: `astral-${randomUUID().slice(0, 8)}`,
      profileToken: token,
      isPublic: true,
    },
    update: {
      isPublic: true,
      // Only set a new token if one doesn't already exist
      profileToken: token,
    },
    select: { profileToken: true },
  })

  return NextResponse.json({ url: `${new URL(request.url).origin}/profile/${updated.profileToken}` })
}
