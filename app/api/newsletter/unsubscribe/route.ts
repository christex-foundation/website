import { NextRequest, NextResponse } from "next/server"
import { unsubscribeFromNewsletter } from "@/lib/airtable"
import { getSiteUrl, verifyUnsubscribeToken } from "@/lib/newsletter"

async function handleUnsubscribe(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = (searchParams.get("email") || "").trim().toLowerCase()
  const token = (searchParams.get("token") || "").trim()

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return { valid: false as const, email }
  }

  const result = await unsubscribeFromNewsletter(email)
  return { valid: true as const, success: result.success, email }
}

// One-click unsubscribe clicked from an email link
export async function GET(request: NextRequest) {
  const result = await handleUnsubscribe(request)
  const baseUrl = getSiteUrl()

  if (!result.valid) {
    return NextResponse.redirect(`${baseUrl}/newsletter?unsubscribed=invalid`)
  }
  if (!result.success) {
    return NextResponse.redirect(`${baseUrl}/newsletter?unsubscribed=error`)
  }
  return NextResponse.redirect(
    `${baseUrl}/newsletter?unsubscribed=1&email=${encodeURIComponent(result.email)}`
  )
}

// RFC 8058 One-Click Unsubscribe POST (used automatically by Gmail/Yahoo unsubscribe button)
export async function POST(request: NextRequest) {
  const result = await handleUnsubscribe(request)
  if (!result.valid) {
    return NextResponse.json({ error: "Invalid unsubscribe token." }, { status: 400 })
  }
  if (!result.success) {
    return NextResponse.json({ error: "Could not process unsubscribe." }, { status: 500 })
  }
  return NextResponse.json({ unsubscribed: true })
}
