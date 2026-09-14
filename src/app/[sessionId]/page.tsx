import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Chat from '../chat'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')
  const { sessionId } = await params
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId }, select: { id: true, userId: true } })
  if (!session) notFound()
  if (session.userId !== user.id) return <main className="access-denied"><p className="eyebrow">ASTRAL / PRIVATE CONVERSATION</p><h1>You can&apos;t view this conversation.</h1><p>This chat is private and the owner has not shared it with you.</p><Link href="/">Return to your workspace</Link></main>
  return <Chat initialSessionId={session.id} />
}