"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Download,
  Loader2,
  Mail,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react"
import type { AdminSubscriberRecord } from "@/lib/airtable-admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SubscribersManagerProps {
  subscribers: AdminSubscriberRecord[]
  loading: boolean
  onRefresh: () => Promise<void>
}

export function SubscribersManager({
  subscribers,
  loading,
  onRefresh,
}: SubscribersManagerProps) {
  const [filter, setFilter] = useState<"All" | "Subscribed" | "Unsubscribed">("All")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const [adding, setAdding] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)

  const activeCount = subscribers.filter(
    (s) => (s.status || "Subscribed").toLowerCase() === "subscribed"
  ).length
  const unsubscribedCount = subscribers.length - activeCount

  const filtered = subscribers.filter((sub) => {
    const isUnsub = sub.status?.toLowerCase() === "unsubscribed"
    if (filter === "Subscribed" && isUnsub) return false
    if (filter === "Unsubscribed" && !isUnsub) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      sub.email.toLowerCase().includes(q) ||
      sub.name.toLowerCase().includes(q) ||
      sub.source.toLowerCase().includes(q)
    )
  })

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast.error("Please enter a valid email address.")
      return
    }
    if (subscribers.some((s) => s.email.toLowerCase() === email)) {
      toast.error("That email is already on the subscriber list.")
      return
    }

    setAdding(true)
    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: newName.trim(),
          status: "Subscribed",
          source: "admin",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add subscriber.")
      await onRefresh()
      setNewEmail("")
      setNewName("")
      setShowAddForm(false)
      toast.success(`Added ${email} to subscribers.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add subscriber.")
    } finally {
      setAdding(false)
    }
  }

  const handleToggleStatus = async (sub: AdminSubscriberRecord) => {
    const isUnsub = sub.status?.toLowerCase() === "unsubscribed"
    const nextStatus = isUnsub ? "Subscribed" : "Unsubscribed"
    setBusyId(sub.id)
    try {
      const res = await fetch(`/api/admin/subscribers/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update subscriber.")
      await onRefresh()
      toast.success(
        nextStatus === "Subscribed"
          ? `${sub.email} re-subscribed.`
          : `${sub.email} marked as unsubscribed.`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update subscriber.")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (sub: AdminSubscriberRecord) => {
    if (!window.confirm(`Remove ${sub.email} permanently from the subscriber list?`)) return
    setBusyId(sub.id)
    try {
      const res = await fetch(`/api/admin/subscribers/${sub.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete subscriber.")
      await onRefresh()
      toast.success("Subscriber removed.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete subscriber.")
    } finally {
      setBusyId(null)
    }
  }

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error("No subscribers to export.")
      return
    }
    const escapeCsv = (val: string) => `"${(val || "").replace(/"/g, '""')}"`
    const header = ["Email", "Name", "Status", "Source", "SubscribedAt"]
    const rows = filtered.map((s) =>
      [s.email, s.name, s.status || "Subscribed", s.source, s.createdTime || ""]
        .map(escapeCsv)
        .join(",")
    )
    const csv = [header.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `christex-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} subscriber${filtered.length === 1 ? "" : "s"}.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Newsletter Subscribers</h2>
          <p className="text-sm text-muted-foreground">
            Manage readers who receive email notifications when you send a published blog post.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddForm((v) => !v)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Subscriber
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Active
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Unsubscribed
          </div>
          <div className="text-2xl font-bold text-muted-foreground mt-1">
            {unsubscribedCount}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Total
          </div>
          <div className="text-2xl font-bold mt-1">{subscribers.length}</div>
        </div>
      </div>

      {/* Add Subscriber Inline Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubscriber}
          className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3"
        >
          <Input
            type="email"
            placeholder="subscriber@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="flex-1 min-w-[220px] h-9 bg-background"
          />
          <Input
            type="text"
            placeholder="Name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full sm:w-48 h-9 bg-background"
          />
          <Button type="submit" size="sm" disabled={adding} className="h-9">
            {adding ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowAddForm(false)}
            className="h-9"
          >
            Cancel
          </Button>
        </form>
      )}

      {/* Filter + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(["All", "Subscribed", "Unsubscribed"] as const).map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={filter === tab ? "secondary" : "ghost"}
              onClick={() => setFilter(tab)}
              className="rounded-full text-xs h-8"
            >
              {tab === "All"
                ? `All (${subscribers.length})`
                : tab === "Subscribed"
                  ? `Subscribed (${activeCount})`
                  : `Unsubscribed (${unsubscribedCount})`}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subscribers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-card"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading subscribers...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
          <Mail className="w-8 h-8 text-muted-foreground/60 mx-auto" />
          <p className="text-muted-foreground">
            {subscribers.length === 0
              ? "No newsletter subscribers yet."
              : "No subscribers match your current filter."}
          </p>
          {subscribers.length === 0 && (
            <p className="text-xs text-muted-foreground/80 max-w-md mx-auto">
              Readers can subscribe on <code className="font-mono">/blog</code> or{" "}
              <code className="font-mono">/newsletter</code>. Make sure you&apos;ve created the{" "}
              <code className="font-mono">Subscribers</code> table in Airtable (columns: Email, Name, Status, Source).
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((sub) => {
            const isUnsub = sub.status?.toLowerCase() === "unsubscribed"
            return (
              <div
                key={sub.id}
                className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                        isUnsub
                          ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {isUnsub ? "Unsubscribed" : "Subscribed"}
                    </span>
                    <span className="font-medium text-sm truncate">{sub.email}</span>
                    {sub.name && (
                      <span className="text-xs text-muted-foreground">({sub.name})</span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground flex flex-wrap items-center gap-2">
                    {sub.source && <span>Source: {sub.source}</span>}
                    {sub.createdTime && (
                      <span>· Joined {new Date(sub.createdTime).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    disabled={busyId === sub.id}
                    onClick={() => handleToggleStatus(sub)}
                  >
                    {busyId === sub.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isUnsub ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        Re-subscribe
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        Unsubscribe
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    disabled={busyId === sub.id}
                    onClick={() => handleDelete(sub)}
                    title="Delete subscriber"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
