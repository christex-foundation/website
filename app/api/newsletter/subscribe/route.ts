import { NextRequest, NextResponse } from "next/server"
import { subscribeToNewsletter } from "@/lib/airtable"
import { isValidEmail, sendWelcomeEmail } from "@/lib/newsletter"

const rateLimitMap = new Map<string, number[]>()
const RATE_WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (rateLimitMap.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    rateLimitMap.set(ip, recent)
    return true
  }
  recent.push(now)
  rateLimitMap.set(ip, recent)
  return false
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string
      name?: string
      source?: string
      website?: string
    }

    // Honeypot trap for bots
    if (body.website && body.website.trim().length > 0) {
      return NextResponse.json({
        subscribed: true,
        alreadySubscribed: false,
        message: "Thanks for subscribing!",
      })
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many subscription attempts. Please wait a minute and try again." },
        { status: 429 }
      )
    }

    const email = (body.email || "").trim().toLowerCase()
    const name = (body.name || "").trim().slice(0, 80)
    const source = (body.source || "website").trim().slice(0, 40)

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      )
    }

    const result = await subscribeToNewsletter({ email, name, source })
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Could not complete subscription right now." },
        { status: 500 }
      )
    }

    if (result.alreadySubscribed) {
      return NextResponse.json({
        subscribed: true,
        alreadySubscribed: true,
        message: "You're already subscribed to the Christex Foundation newsletter!",
      })
    }

    // Fire welcome email if SMTP is configured (don't fail subscription if mail server is slow/unconfigured)
    sendWelcomeEmail({ recipientEmail: email, recipientName: name || undefined }).catch((err) => {
      console.warn("Welcome email failed (subscription still saved):", err)
    })

    return NextResponse.json(
      {
        subscribed: true,
        alreadySubscribed: false,
        reactivated: result.reactivated,
        message: result.reactivated
          ? "Welcome back! Your newsletter subscription has been reactivated."
          : "You're subscribed! You'll get an email whenever we publish a new article.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/newsletter/subscribe error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
