import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function SharedMessage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const message = await prisma.chatMessage.findFirst({ where: { shareToken: token, isShared: true }, include: { session: { select: { title: true } } } })
  if (!message) notFound()
  const content: unknown = JSON.parse(message.contentJson)
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.filter((part): part is { type: 'text'; text: string } => typeof part === 'object' && part !== null && 'type' in part && part.type === 'text').map((part) => part.text).join('\n') : '[Media attachment]'
  return <main className="shared-page"><p className="eyebrow">ASTRAL / SHARED MESSAGE</p><h1>{message.session.title}</h1><article className="shared-thread"><p>{text}</p><small>Shared message · {message.createdAt.toLocaleDateString()}</small></article></main>
}