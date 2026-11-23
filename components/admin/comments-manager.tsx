"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ExternalLink, Eye, EyeOff, Loader2, Trash2 } from "lucide-react"
import type { AdminCommentRecord } from "@/lib/airtable-admin"
import { Button } from "@/components/ui/button"

interface CommentsManagerProps {
  comments: AdminCommentRecord[]
  loading: boolean
  onRefresh: () => Promise<void>
}

export function CommentsManager({ comments, loading, onRefresh }: CommentsManagerProps) {
  const [filter, setFilter] = useState<"All" | "Approved" | "Hidden">("All")
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = comments.filter((c) => {
    const isHidden = c.status?.toLowerCase() === "hidden"
    if (filter === "Approved") return !isHidden
    if (filter === "Hidden") return isHidden
    return true
  })

  const handleToggleStatus = async (comment: AdminCommentRecord) => {
    const nextStatus = comment.status?.toLowerCase() === "hidden" ? "Approved" : "Hidden"
    setBusyId(comment.id)
    try {
      const res = await fetch(`/api/admin/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update comment.")
      await onRefresh()
      toast.success(nextStatus === "Approved" ? "Comment is now visible." : "Comment hidden from the site.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update comment.")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (comment: AdminCommentRecord) => {
    if (!window.confirm(`Delete comment by ${comment.author}?`)) return
    setBusyId(comment.id)
    try {
      const res = await fetch(`/api/admin/comments/${comment.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete comment.")
      await onRefresh()
      toast.success("Comment deleted.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete comment.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Blog Comments</h2>
        <p className="text-sm text-muted-foreground">
          Review reader comments across all articles. Hide or delete spam anytime.
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {(["All", "Approved", "Hidden"] as const).map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={filter === tab ? "secondary" : "ghost"}
            onClick={() => setFilter(tab)}
            className="rounded-full text-xs h-8"
          >
            {tab === "All" ? `All (${comments.length})` : tab}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading comments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          {comments.length === 0
            ? "No reader comments yet."
            : `No ${filter.toLowerCase()} comments.`}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((comment) => {
            const isHidden = comment.status?.toLowerCase() === "hidden"
            return (
              <div key={comment.id} className="p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                          isHidden
                            ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {isHidden ? "Hidden" : "Approved"}
                      </span>
                      <span className="font-semibold text-sm">{comment.author}</span>
                      {comment.createdTime && (
                        <span className="text-xs font-mono text-muted-foreground">
                          · {new Date(comment.createdTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {(comment.postTitle || comment.postSlug) && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span>On:</span>
                        {comment.postSlug ? (
                          <a
                            href={`/blog/${encodeURIComponent(comment.postSlug)}#comments`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {comment.postTitle || comment.postSlug}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span>{comment.postTitle}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      disabled={busyId === comment.id}
                      onClick={() => handleToggleStatus(comment)}
                    >
                      {busyId === comment.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isHidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Approve
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Hide
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      disabled={busyId === comment.id}
                      onClick={() => handleDelete(comment)}
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {comment.body}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
