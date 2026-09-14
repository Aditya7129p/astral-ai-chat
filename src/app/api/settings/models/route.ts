import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getUser() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  return NextResponse.json(
    await prisma.customModel.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
  )
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const modelId = typeof body?.modelId === 'string' ? body.modelId.trim() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const providerConnectionId = typeof body?.providerConnectionId === 'string' ? body.providerConnectionId : ''

  const connection = await prisma.userProviderConnection.findFirst({
    where: { id: providerConnectionId, userId: user.id },
    select: { id: true, provider: true },
  })

  if (!/^[^\s/]+\/[^\s]+$/.test(modelId) || !name || name.length > 80 || !connection) {
    return NextResponse.json(
      { error: 'Choose a connected provider and enter a model ID such as organization/model.' },
      { status: 400 },
    )
  }

  try {
    const model = await prisma.customModel.create({
      data: { userId: user.id, modelId, name, provider: connection.provider, providerConnectionId: connection.id },
    })
    return NextResponse.json(model, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'You already added that model.' }, { status: 409 })
    }
    throw error
  }
}

export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'Model ID is required.' }, { status: 400 })

  // Verify ownership
  const existing = await prisma.customModel.findFirst({
    where: { id, userId: user.id },
    select: { id: true, providerConnectionId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Model not found.' }, { status: 404 })

  // Build partial update — only include fields that were sent
  const data: Record<string, unknown> = {}

  if (typeof body?.name === 'string') {
    const name = body.name.trim()
    if (!name || name.length > 80) return NextResponse.json({ error: 'Name must be 1–80 characters.' }, { status: 400 })
    data.name = name
  }

  if (typeof body?.modelId === 'string') {
    const modelId = body.modelId.trim()
    if (!/^[^\s/]+\/[^\s]+$/.test(modelId)) {
      return NextResponse.json({ error: 'Model ID must be in organization/model format.' }, { status: 400 })
    }
    data.modelId = modelId
  }

  if (typeof body?.providerConnectionId === 'string') {
    const connection = await prisma.userProviderConnection.findFirst({
      where: { id: body.providerConnectionId, userId: user.id },
      select: { id: true, provider: true },
    })
    if (!connection) return NextResponse.json({ error: 'Provider connection not found.' }, { status: 404 })
    data.providerConnectionId = connection.id
    data.provider = connection.provider
  }

  if (typeof body?.enabled === 'boolean') {
    data.enabled = body.enabled
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  try {
    const updated = await prisma.customModel.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'That model ID is already in use.' }, { status: 409 })
    }
    throw error
  }
}

export async function DELETE(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Model ID is required.' }, { status: 400 })
  await prisma.customModel.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ deleted: true })
}
