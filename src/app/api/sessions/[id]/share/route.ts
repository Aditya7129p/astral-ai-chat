import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const { id } = await params

  // Single query: only update if owned by the user; generate token only when not yet set
  const updated = await prisma.chatSession.updateMany({
    where: { id, userId: session.user.id },
    data: {
      isShared: true,
      shareToken: randomBytes(20).toString('base64url'),
    },
  })

  if (updated.count === 0) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
  }

  // Fetch the token (updateMany doesn't return fields)
  const result = await prisma.chatSession.findUnique({
    where: { id },
    select: { shareToken: true },
  })

  return NextResponse.json({ url: `${new URL(request.url).origin}/share/${result!.shareToken}` })
}
