import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const { id } = await params
  const session = await prisma.chatSession.findFirst({ where: { id, userId: user.id }, include: { messages: { orderBy: { createdAt: 'asc' } } } })
  if (!session) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
  return NextResponse.json({ ...session, messages: session.messages.map((message) => ({ ...message, content: JSON.parse(message.contentJson), usage: message.usageJson ? JSON.parse(message.usageJson) : undefined })) })
}