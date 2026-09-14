import { redirect } from 'next/navigation'
import Chat from './chat'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const session = await prisma.chatSession.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, select: { id: true } })
  return <Chat initialSessionId={session?.id ?? null} />
}
