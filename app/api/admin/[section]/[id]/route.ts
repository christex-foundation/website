import { NextRequest, NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import {
  type AdminSection,
  deleteAdminRecord,
  updateAdminRecord,
} from "@/lib/airtable-admin"

const VALID_SECTIONS: AdminSection[] = ["blog", "events", "learn", "ideas", "comments", "subscribers"]
const RECORD_ID_RE = /^rec[a-zA-Z0-9]+$/

function parseSection(raw: string): AdminSection | null {
  return VALID_SECTIONS.includes(raw as AdminSection) ? (raw as AdminSection) : null
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ section: string; id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { section: rawSection, id } = await context.params
  const section = parseSection(rawSection)
  if (!section) {
    return NextResponse.json({ error: "Unknown section." }, { status: 404 })
  }
  if (!RECORD_ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid record ID." }, { status: 400 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const record = await updateAdminRecord(section, id, body)
    return NextResponse.json({ record })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update record."
    console.error(`PATCH /api/admin/${section}/${id} error:`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ section: string; id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { section: rawSection, id } = await context.params
  const section = parseSection(rawSection)
  if (!section) {
    return NextResponse.json({ error: "Unknown section." }, { status: 404 })
  }
  if (!RECORD_ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid record ID." }, { status: 400 })
  }

  try {
    await deleteAdminRecord(section, id)
    return NextResponse.json({ deleted: true, id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete record."
    console.error(`DELETE /api/admin/${section}/${id} error:`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
