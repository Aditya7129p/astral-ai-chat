import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function SharedImagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const image = await prisma.sharedImage.findUnique({ where: { token }, select: { dataUrl: true } })
  if (!image) notFound()
  return <main className="shared-image-page"><p className="eyebrow">ASTRAL / SHARED IMAGE</p><h1>A generated image from Astral.</h1><img src={image.dataUrl} alt="Shared generated result" /><a href={image.dataUrl} download="astral-image.png">Download image</a></main>
}