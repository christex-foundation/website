import type { Metadata } from "next"
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth"
import { AdminShell } from "@/components/admin/admin-shell"

export const metadata: Metadata = {
  title: "Content Studio",
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const configured = isAdminConfigured()
  const authenticated = configured ? await isAdminAuthenticated() : false

  return <AdminShell initialAuthenticated={authenticated} configured={configured} />
}
