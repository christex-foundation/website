"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ExternalLink, Loader2, Trash2 } from "lucide-react"
import type { AdminIdeaRecord } from "@/lib/airtable-admin"
import { Button } from "@/components/ui/button"

const IDEA_STATUSES = ["New", "In Review", "Approved", "Archived"] as const

const STATUS_STYLES: Record<string, string> = {
  New: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  "In Review": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Archived: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
}

interface IdeasManagerProps {
  ideas: AdminIdeaRecord[]
  loading: boolean
  onRefresh: () => Promise<void>
}

export function IdeasManager({ ideas, loading, onRefresh }: IdeasManagerProps) {
  const [filter, setFilter] = useState<string>("All")
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = ideas.filter((idea) => filter === "All" || (idea.status || "New") === filter)

  const handleStatusChange = async (idea: AdminIdeaRecord, nextStatus: string) => {
    setBusyId(idea.id)
    try {
      const res = await fetch(`/api/admin/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update status.")
      await onRefresh()
      toast.success(`Updated "${idea.title}" to ${nextStatus}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status.")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (idea: AdminIdeaRecord) => {
    if (!window.confirm(`Delete idea "${idea.title}"?`)) return
    setBusyId(idea.id)
    try {
      const res = await fetch(`/api/admin/ideas/${idea.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete idea.")
      await onRefresh()
      toast.success("Idea deleted.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete idea.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Submitted Ideas</h2>
        <p className="text-sm text-muted-foreground">
          Proposals submitted via the &quot;Submit Your Idea&quot; form on the website.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {["All", ...IDEA_STATUSES].map((status) => (
          <Button
            key={status}
            size="sm"
            variant={filter === status ? "secondary" : "ghost"}
            onClick={() => setFilter(status)}
            className="rounded-full text-xs h-8"
          >
            {status === "All" ? `All (${ideas.length})` : status}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading proposals...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          {ideas.length === 0
            ? "No proposals submitted yet."
            : `No proposals with status "${filter}".`}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((idea) => {
            const status = idea.status || "New"
            const badgeClass = STATUS_STYLES[status] || STATUS_STYLES.New
            const isUrl = /^https?:\/\//i.test(idea.resources.trim())
            return (
              <div
                key={idea.id}
                className="rounded-xl border border-border bg-card p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                        {status}
                      </span>
                      {idea.category && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {idea.category}
                        </span>
                      )}
                      {idea.createdTime && (
                        <span className="text-xs font-mono text-muted-foreground">
                          · {new Date(idea.createdTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold">{idea.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Status for ${idea.title}`}
                      value={status}
                      disabled={busyId === idea.id}
                      onChange={(e) => handleStatusChange(idea, e.target.value)}
                      className="h-8 rounded-md border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {IDEA_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      disabled={busyId === idea.id}
                      onClick={() => handleDelete(idea)}
                      title="Delete proposal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1 rounded-lg bg-background/60 p-3 border border-border/60">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      Problem
                    </p>
                    <p className="text-foreground/90 whitespace-pre-wrap">{idea.problem || "—"}</p>
                  </div>
                  <div className="space-y-1 rounded-lg bg-background/60 p-3 border border-border/60">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      Proposed Solution
                    </p>
                    <p className="text-foreground/90 whitespace-pre-wrap">{idea.solution || "—"}</p>
                  </div>
                </div>

                {idea.resources && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="font-mono uppercase tracking-wider">Resources:</span>
                    {isUrl ? (
                      <a
                        href={idea.resources.trim()}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {idea.resources.trim()}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-foreground">{idea.resources}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
