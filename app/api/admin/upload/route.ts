import { NextRequest, NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import {
  type AdminSection,
  uploadAdminAttachment,
} from "@/lib/airtable-admin"

const VALID_SECTIONS: AdminSection[] = ["blog", "events", "learn", "ideas"]
const RECORD_ID_RE = /^rec[a-zA-Z0-9]+$/
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
])
const MAX_BYTES = 5 * 1024 * 1024 // Airtable uploadAttachment limit: 5 MB

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const section = VALID_SECTIONS.includes(body?.section) ? (body.section as AdminSection) : null
    const recordId = typeof body?.recordId === "string" ? body.recordId : ""
    const fieldName = typeof body?.fieldName === "string" ? body.fieldName : ""
    const filename = typeof body?.filename === "string" ? body.filename : "image.jpg"
    const contentType = typeof body?.contentType === "string" ? body.contentType : ""
    const base64 = typeof body?.base64 === "string" ? body.base64 : ""
    const replace = Boolean(body?.replace)

    if (!section || !RECORD_ID_RE.test(recordId) || !fieldName || !base64) {
      return NextResponse.json({ error: "Missing required upload fields." }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WebP, GIF, and AVIF images are supported." },
        { status: 400 }
      )
    }

    const decodedSize = Math.floor((base64.length * 3) / 4)
    if (decodedSize > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds the 5 MB upload limit. Please choose a smaller image." },
        { status: 413 }
      )
    }

    const record = await uploadAdminAttachment({
      section,
      recordId,
      fieldName,
      filename,
      contentType,
      base64,
      replace,
    })

    return NextResponse.json({ record })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed."
    console.error("POST /api/admin/upload error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
