import { NextRequest, NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import {
  type AdminSection,
  createAdminRecord,
  listAdminRecords,
} from "@/lib/airtable-admin"

const VALID_SECTIONS: AdminSection[] = ["blog", "events", "learn", "ideas", "comments", "subscribers"]

function parseSection(raw: string): AdminSection | null {
  return VALID_SECTIONS.includes(raw as AdminSection) ? (raw as AdminSection) : null
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ section: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { section: rawSection } = await context.params
  const section = parseSection(rawSection)
  if (!section) {
    return NextResponse.json({ error: "Unknown section." }, { status: 404 })
  }

  try {
    const records = await listAdminRecords(section)
    return NextResponse.json({ records })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load records."
    console.error(`GET /api/admin/${section} error:`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ section: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { section: rawSection } = await context.params
  const section = parseSection(rawSection)
  if (!section) {
    return NextResponse.json({ error: "Unknown section." }, { status: 404 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const record = await createAdminRecord(section, body)
    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create record."
    console.error(`POST /api/admin/${section} error:`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
