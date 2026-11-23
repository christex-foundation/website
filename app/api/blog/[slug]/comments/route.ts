import { NextRequest, NextResponse } from "next/server"
import { createPostComment, getPostComments } from "@/lib/airtable"

// Simple in-memory rate limit (max 5 comments per minute per IP)
const recentSubmissions = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (recentSubmissions.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (timestamps.length >= MAX_PER_WINDOW) {
    recentSubmissions.set(ip, timestamps)
    return true
  }
  timestamps.push(now)
  recentSubmissions.set(ip, timestamps)
  return false
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const comments = await getPostComments(slug)
  return NextResponse.json({ comments })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "You are commenting too quickly. Please wait a minute and try again." },
      { status: 429 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
  }

  // Honeypot anti-spam trap: bots fill hidden "website" field
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  const author = typeof body.author === "string" ? body.author.trim() : ""
  const text = typeof body.body === "string" ? body.body.trim() : ""
  const postTitle = typeof body.postTitle === "string" ? body.postTitle.trim() : undefined

  if (author.length < 2 || author.length > 60) {
    return NextResponse.json(
      { error: "Please enter a name between 2 and 60 characters." },
      { status: 400 }
    )
  }

  if (text.length < 2 || text.length > 1500) {
    return NextResponse.json(
      { error: "Comment must be between 2 and 1,500 characters." },
      { status: 400 }
    )
  }

  const result = await createPostComment({
    postSlug: slug,
    postTitle,
    author,
    body: text,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ comment: result.comment }, { status: 201 })
}
