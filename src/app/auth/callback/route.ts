import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const redirectPath = next?.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (!code) {
    return NextResponse.redirect(new URL('/auth?error=The%20confirmation%20link%20is%20invalid.', requestUrl.origin))
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
  }

  if (data.user) {
    const username = typeof data.user.user_metadata?.username === 'string' ? data.user.user_metadata.username : `astral-${data.user.id.slice(0, 6)}`
    const avatarDataUrl = typeof data.user.user_metadata?.avatarDataUrl === 'string' ? data.user.user_metadata.avatarDataUrl : null
    await prisma.userProfile.upsert({ where: { userId: data.user.id }, create: { userId: data.user.id, username, avatarDataUrl }, update: {} }).catch(() => undefined)
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
}
