import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function PublicProfile({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const profile = await prisma.userProfile.findFirst({ where: { profileToken: token, isPublic: true }, select: { username: true, avatarDataUrl: true } })
  if (!profile) notFound()
  return <main className="public-profile"><p className="eyebrow">ASTRAL / PROFILE</p>{profile.avatarDataUrl && <img src={profile.avatarDataUrl} alt="" />}<h1>{profile.username}</h1><p>Public Astral profile</p></main>
}