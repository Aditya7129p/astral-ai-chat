import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get('username')?.trim() ?? ''
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return NextResponse.json({ valid: false, available: false, error: 'Use 3-24 letters, numbers, or underscores.' })
  const profile = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } })
  return NextResponse.json({ valid: true, available: !profile })
}