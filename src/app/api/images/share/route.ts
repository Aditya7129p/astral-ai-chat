import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const dataUrl = typeof body?.dataUrl === 'string' && body.dataUrl.startsWith('data:image/') ? body.dataUrl : ''
  if (!dataUrl || dataUrl.length > 8_000_000) {
    return NextResponse.json({ error: 'That image cannot be shared.' }, { status: 400 })
  }

  const image = await prisma.sharedImage.create({
    data: { userId: session.user.id, token: randomBytes(20).toString('base64url'), dataUrl },
    select: { token: true },
  })

  return NextResponse.json({ url: `${new URL(request.url).origin}/image/${image.token}` })
}
