"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface NewsletterSubscribeCardProps {
  source?: string
  variant?: "banner" | "hero"
  className?: string
  heading?: string
  description?: string
}

export function NewsletterSubscribeCard({
  source = "website",
  variant = "banner",
  className,
  heading,
  description,
}: NewsletterSubscribeCardProps) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [website, setWebsite] = useState("") // Honeypot
  const [submitting, setSubmitting] = useState(false)
  const [doneMessage, setDoneMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          name: name.trim() || undefined,
          source,
          website,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.error || "Could not subscribe right now."
        setErrorMessage(msg)
        toast.error(msg)
        return
      }

      const msg =
        data.message ||
        "You're subscribed! You'll get an email whenever we publish a new article."
      setDoneMessage(msg)
      setEmail("")
      setName("")
      toast.success(msg)
    } catch {
      const msg = "Network error. Please try again."
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const isHero = variant === "hero"
  const titleText =
    heading ||
    (isHero
      ? "Get every new story straight to your inbox."
      : "Never miss a new article.")
  const descText =
    description ||
    "Subscribe to receive our latest insights on AI, blockchain, venture building, and Sierra Leone's tech ecosystem whenever a new post drops."

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card",
        isHero ? "p-8 sm:p-10" : "p-6 sm:p-8",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-[80px]"
      />

      <div
        className={cn(
          "relative z-10",
          isHero
            ? "space-y-6"
            : "grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center"
        )}
      >
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-primary">
            <Mail className="h-3.5 w-3.5" />
            Newsletter
          </div>
          <h2
            className={cn(
              "font-bold tracking-tight text-foreground",
              isHero ? "text-2xl sm:text-3xl" : "text-2xl"
            )}
          >
            {titleText}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-xl">
            {descText}
          </p>
        </div>

        {doneMessage ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-medium text-emerald-100">{doneMessage}</p>
              <button
                type="button"
                onClick={() => setDoneMessage(null)}
                className="text-xs font-mono text-emerald-300/80 hover:text-emerald-200 underline underline-offset-4"
              >
                Subscribe another email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            {/* Honeypot for spam bots */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <div className={cn("grid gap-2.5", isHero ? "sm:grid-cols-2" : "sm:grid-cols-[1fr_auto]")}>
              {isHero && (
                <Input
                  type="text"
                  placeholder="First name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  disabled={submitting}
                  className="h-11 bg-background"
                />
              )}
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errorMessage) setErrorMessage(null)
                }}
                required
                disabled={submitting}
                aria-label="Email address"
                className="h-11 bg-background"
              />
              {!isHero && (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 gap-2 shrink-0"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Subscribe
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>

            {isHero && (
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full sm:w-auto px-8 gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    Subscribe to Newsletter
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}

            {errorMessage && (
              <p className="text-xs text-red-400">{errorMessage}</p>
            )}

            <p className="text-[11px] font-mono text-muted-foreground/80">
              No spam. Only new articles from Christex Foundation. Unsubscribe in one click anytime.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
