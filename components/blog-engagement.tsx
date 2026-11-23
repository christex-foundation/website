"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { Heart, Loader2, MessageSquare, Send } from "lucide-react"
import type { BlogComment } from "@/lib/airtable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const LIKED_STORAGE_KEY = "christex_liked_posts"
const LIKE_SYNC_EVENT = "christex-like-sync"

function readLikedSlugs(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(LIKED_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeLikedSlugs(slugs: Set<string>) {
  try {
    window.localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(Array.from(slugs)))
  } catch {
    // Ignore storage errors (private browsing)
  }
}

function subscribeLikedStore(callback: () => void) {
  window.addEventListener(LIKE_SYNC_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(LIKE_SYNC_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

interface BlogLikeButtonProps {
  slug: string
  initialLikes: number
}

export function BlogLikeButton({ slug, initialLikes }: BlogLikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [busy, setBusy] = useState(false)

  const liked = useSyncExternalStore(
    subscribeLikedStore,
    () => readLikedSlugs().has(slug),
    () => false
  )

  useEffect(() => {
    // Sync live count once on mount so cached pages still reflect fresh likes
    let cancelled = false
    fetch(`/api/blog/${encodeURIComponent(slug)}/like`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.likes === "number") {
          setLikes(data.likes)
        }
      })
      .catch(() => {})

    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<{ slug: string; likes?: number }>).detail
      if (detail?.slug === slug && typeof detail.likes === "number") {
        setLikes(detail.likes)
      }
    }
    window.addEventListener(LIKE_SYNC_EVENT, handleSync)

    return () => {
      cancelled = true
      window.removeEventListener(LIKE_SYNC_EVENT, handleSync)
    }
  }, [slug])

  const handleToggleLike = async () => {
    if (busy) return
    const nextLiked = !liked
    const previousLikes = likes
    const optimisticLikes = Math.max(0, likes + (nextLiked ? 1 : -1))

    setLikes(optimisticLikes)
    setBusy(true)

    const slugs = readLikedSlugs()
    if (nextLiked) slugs.add(slug)
    else slugs.delete(slug)
    writeLikedSlugs(slugs)

    window.dispatchEvent(
      new CustomEvent(LIKE_SYNC_EVENT, {
        detail: { slug, likes: optimisticLikes },
      })
    )

    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: nextLiked ? "like" : "unlike" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not update like.")

      if (typeof data.likes === "number") {
        setLikes(data.likes)
        window.dispatchEvent(
          new CustomEvent(LIKE_SYNC_EVENT, {
            detail: { slug, likes: data.likes },
          })
        )
      }
    } catch {
      // Revert optimistic state
      setLikes(previousLikes)
      const reverted = readLikedSlugs()
      if (!nextLiked) reverted.add(slug)
      else reverted.delete(slug)
      writeLikedSlugs(reverted)
      window.dispatchEvent(
        new CustomEvent(LIKE_SYNC_EVENT, {
          detail: { slug, likes: previousLikes },
        })
      )
      toast.error("Could not save like right now. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleToggleLike}
      disabled={busy}
      className={`gap-1.5 rounded-full transition-colors ${
        liked
          ? "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
          : ""
      }`}
      aria-pressed={liked}
      aria-label={liked ? "Unlike article" : "Like article"}
    >
      <Heart className={`w-3.5 h-3.5 transition-transform ${liked ? "fill-rose-500 text-rose-500 scale-110" : ""}`} />
      <span className="font-mono text-xs">{likes}</span>
    </Button>
  )
}

function formatCommentDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?"
  )
}

interface BlogCommentsProps {
  slug: string
  postTitle: string
  initialComments: BlogComment[]
}

export function BlogComments({ slug, postTitle, initialComments }: BlogCommentsProps) {
  const [comments, setComments] = useState<BlogComment[]>(initialComments)
  const [author, setAuthor] = useState("")
  const [body, setBody] = useState("")
  const [website, setWebsite] = useState("") // Honeypot
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!author.trim() || !body.trim()) {
      toast.error("Please enter your name and a comment.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: author.trim(),
          body: body.trim(),
          postTitle,
          website,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to post comment.")
      }

      if (data.comment) {
        setComments((prev) => [data.comment as BlogComment, ...prev])
      }
      setBody("")
      toast.success("Comment posted!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post comment.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="comments" className="mt-16 pt-12 border-t border-border space-y-8">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold">
          Comments
          <span className="ml-2 text-sm font-mono font-normal text-muted-foreground">
            ({comments.length})
          </span>
        </h2>
      </div>

      {/* Comment Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6 space-y-4"
      >
        <div className="space-y-2">
          <label htmlFor="comment-author" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Your Name
          </label>
          <Input
            id="comment-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g. Aminata Kamara"
            maxLength={60}
            required
            className="bg-background"
          />
        </div>

        {/* Hidden honeypot field for spam bots */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />

        <div className="space-y-2">
          <label htmlFor="comment-body" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Comment
          </label>
          <Textarea
            id="comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts on this article..."
            maxLength={1500}
            required
            className="min-h-[110px] bg-background resize-y"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground font-mono">
            {body.length}/1500
          </span>
          <Button type="submit" disabled={submitting} className="gap-2 rounded-full px-5">
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Post Comment
          </Button>
        </div>
      </form>

      {/* Comment List */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No comments yet — be the first to start the conversation.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-border bg-card/40 p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-mono font-bold text-primary">
                    {getInitials(comment.author)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{comment.author}</div>
                    {comment.createdAt && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {formatCommentDate(comment.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
