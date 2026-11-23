import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { getPostLikes, updatePostLikes } from "@/lib/airtable"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const likes = await getPostLikes(slug)
  if (likes === null) {
    return NextResponse.json({ likes: 0 })
  }
  return NextResponse.json({ likes })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params

  let action: "like" | "unlike" = "like"
  try {
    const body = await request.json()
    if (body?.action === "unlike") action = "unlike"
  } catch {
    // Default to like
  }

  const result = await updatePostLikes(slug, action === "like" ? 1 : -1)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidateTag("blog", { expire: 0 })
  return NextResponse.json({ likes: result.likes })
}
