import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { revalidateSection } from "@/lib/airtable-admin"

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  revalidateSection("blog")
  revalidateSection("events")
  revalidateSection("learn")

  return NextResponse.json({
    revalidated: true,
    timestamp: new Date().toISOString(),
  })
}
