import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const { id } = await params
  const deleted = await prisma.chatSession.deleteMany({ where: { id, userId: user.id } })
  if (!deleted.count) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
  return NextResponse.json({ deleted: true })
}