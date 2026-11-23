import crypto from "crypto"
import { cookies } from "next/headers"

export const ADMIN_COOKIE_NAME = "christex_admin_session"
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

function getPasscode(): string | null {
  const code = process.env.ADMIN_PASSCODE?.trim()
  return code ? code : null
}

function getSigningSecret(): string {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim()
  if (explicit) return explicit
  const passcode = getPasscode() || ""
  const salt = process.env.AIRTABLE_BASE_ID || "christex-admin-v1"
  return crypto.createHash("sha256").update(`${passcode}:${salt}:session`).digest("hex")
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export function isAdminConfigured(): boolean {
  return Boolean(getPasscode())
}

export function verifyPasscode(provided: string): boolean {
  const expected = getPasscode()
  if (!expected || !provided) return false
  return timingSafeEqualString(provided.trim(), expected)
}

export function createSessionToken(): string {
  const expiresAt = String(Date.now() + SESSION_TTL_MS)
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(expiresAt)
    .digest("hex")
  return `${expiresAt}.${signature}`
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !isAdminConfigured()) return false
  const parts = token.split(".")
  if (parts.length !== 2) return false
  const [expiresAtStr, signature] = parts
  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false

  const expectedSignature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(expiresAtStr)
    .digest("hex")

  return timingSafeEqualString(signature, expectedSignature)
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  return verifySessionToken(token)
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  }
}
