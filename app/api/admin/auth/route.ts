import { NextRequest, NextResponse } from "next/server"
import {
  ADMIN_COOKIE_NAME,
  createSessionToken,
  getAdminCookieOptions,
  isAdminAuthenticated,
  isAdminConfigured,
  verifyPasscode,
} from "@/lib/admin-auth"

export async function GET() {
  const configured = isAdminConfigured()
  const authenticated = configured ? await isAdminAuthenticated() : false
  return NextResponse.json({ authenticated, configured })
}

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_PASSCODE is not configured on the server." },
      { status: 500 }
    )
  }

  let passcode = ""
  try {
    const body = await request.json()
    passcode = typeof body?.passcode === "string" ? body.passcode : ""
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  if (!verifyPasscode(passcode)) {
    // Brief delay to deter rapid brute-force attempts
    await new Promise((resolve) => setTimeout(resolve, 400))
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 })
  }

  const token = createSessionToken()
  const response = NextResponse.json({ authenticated: true })
  response.cookies.set(ADMIN_COOKIE_NAME, token, getAdminCookieOptions())
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false })
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  })
  return response
}
