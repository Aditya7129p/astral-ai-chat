import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const { id } = await params
  const question = await prisma.question.findFirst({ where: { id, userId: user.id } })
  if (!question) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
  const updated = await prisma.question.update({ where: { id }, data: { shareToken: question.shareToken ?? randomBytes(18).toString('base64url'), isShared: true }, select: { shareToken: true } })
  return NextResponse.json({ url: `${new URL(request.url).origin}/share/${updated.shareToken}` })
}