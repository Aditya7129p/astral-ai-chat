import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const sessions = await prisma.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, model: true, isShared: true, updatedAt: true, _count: { select: { messages: true } } },
  })
  return NextResponse.json(sessions)
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 90) : 'New conversation'
  const session = await prisma.chatSession.create({ data: { userId: user.id, title } })
  return NextResponse.json({ id: session.id }, { status: 201 })
}