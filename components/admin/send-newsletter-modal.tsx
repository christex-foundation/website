"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  Users,
  X,
} from "lucide-react"
import type { AdminBlogRecord } from "@/lib/airtable-admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface SendNewsletterModalProps {
  post: AdminBlogRecord | null
  onClose: () => void
}

interface NewsletterStatus {
  smtpConfigured: boolean
  smtpFrom: string | null
  smtpHost: string | null
  activeSubscriberCount: number
}

interface BroadcastResult {
  total: number
  sent: number
  failed: number
  errors: Array<{ email: string; error: string }>
}

function summarizePostContent(content: string, maxLen = 200): string {
  const plain = content
    .replace(/^#+\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/{{image:\d+}}/g, "")
    .replace(/{{video(?::[^}]+)?}}/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (plain.length <= maxLen) return plain
  return plain.slice(0, maxLen).trim() + "..."
}

export function SendNewsletterModal({ post, onClose }: SendNewsletterModalProps) {
  if (!post) return null
  return <SendNewsletterModalInner key={post.id} post={post} onClose={onClose} />
}

function SendNewsletterModalInner({
  post,
  onClose,
}: {
  post: AdminBlogRecord
  onClose: () => void
}) {
  const [statusLoading, setStatusLoading] = useState(true)
  const [status, setStatus] = useState<NewsletterStatus | null>(null)
  const [subject, setSubject] = useState(() => post.title || "")
  const [intro, setIntro] = useState(
    () => post.excerpt?.trim() || summarizePostContent(post.content || "")
  )
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [confirmBroadcast, setConfirmBroadcast] = useState(false)
  const [result, setResult] = useState<BroadcastResult | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      try {
        const res = await fetch("/api/admin/newsletter/send", { cache: "no-store" })
        const data = await res.json()
        if (!cancelled && res.ok) {
          setStatus(data)
        }
      } catch {
        // Ignore fetch errors; user will see fallback message
      } finally {
        if (!cancelled) setStatusLoading(false)
      }
    }

    loadStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const coverUrl = post.image[0]?.url || post.contentImages[0]?.url || null
  const smtpReady = Boolean(status?.smtpConfigured)
  const subscriberCount = status?.activeSubscriberCount ?? 0

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testEmail.trim()) {
      toast.error("Enter an email address for the test send.")
      return
    }
    setSendingTest(true)
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          mode: "test",
          testEmail: testEmail.trim(),
          customSubject: subject.trim(),
          customIntro: intro.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send test email.")
      toast.success(`Test email sent to ${testEmail.trim()}! Check your inbox.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send test email.")
    } finally {
      setSendingTest(false)
    }
  }

  const handleBroadcast = async () => {
    setSendingBroadcast(true)
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          mode: "broadcast",
          customSubject: subject.trim(),
          customIntro: intro.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send newsletter.")
      setResult(data)
      setConfirmBroadcast(false)
      if (data.failed === 0) {
        toast.success(`Newsletter sent to ${data.sent} subscriber${data.sent === 1 ? "" : "s"}!`)
      } else {
        toast.warning(`Sent to ${data.sent}/${data.total} subscribers (${data.failed} failed).`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send newsletter.")
    } finally {
      setSendingBroadcast(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-newsletter-title"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 id="send-newsletter-title" className="font-semibold text-base">
                Send Article to Newsletter Subscribers
              </h3>
              <p className="text-xs text-muted-foreground">
                Preview, send yourself a test email, then broadcast to subscribers.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
            disabled={sendingBroadcast}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status Banner */}
          {statusLoading ? (
            <div className="rounded-xl border border-border bg-background/60 p-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking email server and subscriber count...
            </div>
          ) : !smtpReady ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                SMTP email credentials not configured yet
              </div>
              <p className="text-amber-200/85 leading-relaxed">
                Add <code className="font-mono bg-black/40 px-1 py-0.5 rounded">SMTP_USER</code> and{" "}
                <code className="font-mono bg-black/40 px-1 py-0.5 rounded">SMTP_PASS</code> (your Google Workspace App Password) plus optional{" "}
                <code className="font-mono bg-black/40 px-1 py-0.5 rounded">SMTP_HOST</code> /{" "}
                <code className="font-mono bg-black/40 px-1 py-0.5 rounded">SMTP_FROM</code> to{" "}
                <code className="font-mono">.env.local</code> and Vercel, then restart/redeploy.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background/60 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4 text-primary" />
                <span>
                  Ready to send to{" "}
                  <strong className="text-foreground">{subscriberCount}</strong> active{" "}
                  {subscriberCount === 1 ? "subscriber" : "subscribers"}
                </span>
              </div>
              {status?.smtpFrom && (
                <span className="font-mono text-[11px] text-muted-foreground truncate max-w-xs">
                  From: {status.smtpFrom}
                </span>
              )}
            </div>
          )}

          {/* Result Banner after broadcast */}
          {result && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-semibold text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Broadcast complete: {result.sent} of {result.total} delivered
                {result.failed > 0 ? ` (${result.failed} failed)` : ""}
              </div>
              {result.errors.length > 0 && (
                <ul className="text-xs text-red-300 space-y-1 pl-6 list-disc">
                  {result.errors.map((err) => (
                    <li key={err.email}>
                      {err.email}: {err.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Editable Subject & Summary */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nl-subject" className="text-xs">
                Email Subject
              </Label>
              <Input
                id="nl-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Article title..."
                className="bg-background h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nl-intro" className="text-xs">
                Short Preview / Intro Text
              </Label>
              <Textarea
                id="nl-intro"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="1–2 sentences summarizing why readers should open this article..."
                className="bg-background min-h-[76px] text-sm"
              />
            </div>
          </div>

          {/* Visual Email Preview */}
          <div className="space-y-1.5">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Email Preview
            </div>
            <div className="rounded-xl border border-border bg-[#111113] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
                <span className="text-white font-semibold">Christex Foundation</span>
                <span className="text-sky-400">{post.category || "New Article"}</span>
              </div>
              {coverUrl && (
                <div className="aspect-[16/8] bg-black overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 space-y-2.5">
                <h4 className="font-bold text-base text-white leading-snug">
                  {subject || post.title}
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
                  {intro || "Read the latest story and insights from the Christex Foundation."}
                </p>
                <div className="pt-1">
                  <span className="inline-block rounded-full bg-white text-black px-4 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider">
                    Read Full Article →
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Test Send Section */}
          <form
            onSubmit={handleSendTest}
            className="rounded-xl border border-border bg-background/50 p-4 space-y-2.5"
          >
            <Label htmlFor="nl-test-email" className="text-xs">
              Send a test email first (recommended)
            </Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="nl-test-email"
                type="email"
                placeholder="your-email@christex.foundation"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                disabled={!smtpReady || sendingTest || sendingBroadcast}
                className="flex-1 min-w-[200px] h-9 bg-background"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={!smtpReady || sendingTest || sendingBroadcast}
                className="h-9 gap-1.5"
              >
                {sendingTest ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send Test
              </Button>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={sendingBroadcast}
          >
            Close
          </Button>

          {!confirmBroadcast ? (
            <Button
              type="button"
              size="sm"
              disabled={!smtpReady || subscriberCount === 0 || sendingBroadcast}
              onClick={() => setConfirmBroadcast(true)}
              className="gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              Send to {subscriberCount} {subscriberCount === 1 ? "Subscriber" : "Subscribers"}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300 font-medium">
                Confirm sending to {subscriberCount} people?
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={sendingBroadcast}
                onClick={() => setConfirmBroadcast(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={sendingBroadcast}
                onClick={handleBroadcast}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {sendingBroadcast ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Yes, Send Now
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
