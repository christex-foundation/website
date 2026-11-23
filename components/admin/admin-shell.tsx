"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  BookOpen,
  Calendar,
  Eye,
  EyeOff,
  FileText,
  Lightbulb,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import type {
  AdminBlogRecord,
  AdminEventRecord,
  AdminIdeaRecord,
  AdminLearnRecord,
  AdminSection,
} from "@/lib/airtable-admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BlogManager } from "./blog-manager"
import { EventsManager } from "./events-manager"
import { LearnManager } from "./learn-manager"
import { IdeasManager } from "./ideas-manager"

interface AdminShellProps {
  initialAuthenticated: boolean
  configured: boolean
}

export function AdminShell({ initialAuthenticated, configured }: AdminShellProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated)
  const [passcode, setPasscode] = useState("")
  const [showPasscode, setShowPasscode] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")

  const [activeTab, setActiveTab] = useState<AdminSection>("blog")
  const [loading, setLoading] = useState(initialAuthenticated)

  const [posts, setPosts] = useState<AdminBlogRecord[]>([])
  const [events, setEvents] = useState<AdminEventRecord[]>([])
  const [learn, setLearn] = useState<AdminLearnRecord[]>([])
  const [ideas, setIdeas] = useState<AdminIdeaRecord[]>([])

  const fetchSection = useCallback(async (section: AdminSection) => {
    const res = await fetch(`/api/admin/${section}`, { cache: "no-store" })
    if (res.status === 401) {
      setAuthenticated(false)
      return
    }
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || `Failed to load ${section}.`)
    }
    if (section === "blog") setPosts(data.records || [])
    if (section === "events") setEvents(data.records || [])
    if (section === "learn") setLearn(data.records || [])
    if (section === "ideas") setIdeas(data.records || [])
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchSection("blog"),
        fetchSection("events"),
        fetchSection("learn"),
        fetchSection("ideas"),
      ])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load Airtable data.")
    } finally {
      setLoading(false)
    }
  }, [fetchSection])

  useEffect(() => {
    if (!authenticated) return
    let cancelled = false
    const sections: AdminSection[] = ["blog", "events", "learn", "ideas"]

    async function loadInitial() {
      try {
        const results = await Promise.all(
          sections.map(async (section) => {
            const res = await fetch(`/api/admin/${section}`, { cache: "no-store" })
            if (res.status === 401) return { section, unauthorized: true as const, records: [] }
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || `Failed to load ${section}.`)
            return { section, unauthorized: false as const, records: data.records || [] }
          })
        )
        if (cancelled) return
        if (results.some((r) => r.unauthorized)) {
          setAuthenticated(false)
          return
        }
        for (const r of results) {
          if (r.section === "blog") setPosts(r.records)
          if (r.section === "events") setEvents(r.records)
          if (r.section === "learn") setLearn(r.records)
          if (r.section === "ideas") setIdeas(r.records)
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load Airtable data.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInitial()
    return () => {
      cancelled = true
    }
  }, [authenticated])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passcode.trim()) return
    setAuthLoading(true)
    setAuthError("")
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAuthError(data.error || "Incorrect passcode.")
        return
      }
      setPasscode("")
      setLoading(true)
      setAuthenticated(true)
      toast.success("Welcome to Christex Content Studio.")
    } catch {
      setAuthError("Network error. Please try again.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" })
    setAuthenticated(false)
    toast.success("Signed out.")
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 space-y-6 shadow-2xl">
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Christex Content Studio</h1>
            <p className="text-xs text-muted-foreground">
              Enter your team passcode to manage blog posts, events, and resources.
            </p>
          </div>

          {!configured ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-1">
              <p className="font-semibold">Passcode not configured yet</p>
              <p className="text-amber-200/80">
                Add <code className="font-mono bg-black/40 px-1 py-0.5 rounded">ADMIN_PASSCODE</code> to your{" "}
                <code className="font-mono">.env.local</code> or Vercel Environment Variables and restart/redeploy.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPasscode ? "text" : "password"}
                  placeholder="Enter team passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  autoFocus
                  required
                  className="pr-10 h-11 bg-background"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authError && <p className="text-xs text-red-400 text-center">{authError}</p>}

              <Button type="submit" disabled={authLoading} className="w-full h-11">
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Unlock Studio
              </Button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-border">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Christex Foundation
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const tabs: Array<{ id: AdminSection; label: string; count: number; icon: React.ReactNode }> = [
    { id: "blog", label: "Blog", count: posts.length, icon: <FileText className="w-4 h-4" /> },
    { id: "events", label: "Events", count: events.length, icon: <Calendar className="w-4 h-4" /> },
    { id: "learn", label: "Learn", count: learn.length, icon: <BookOpen className="w-4 h-4" /> },
    {
      id: "ideas",
      label: "Ideas",
      count: ideas.filter((i) => (i.status || "New") === "New").length,
      icon: <Lightbulb className="w-4 h-4" />,
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-bold tracking-tight text-sm sm:text-base">
              Christex Foundation
            </Link>
            <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Studio
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchAll}
              disabled={loading}
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              title="Refresh from Airtable"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-muted-foreground">
              <Link href="/" target="_blank">
                <span className="hidden sm:inline">View Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleLogout}
              className="h-8 gap-1.5 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </Button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "blog" && (
          <BlogManager
            posts={posts}
            loading={loading}
            onRefresh={() => fetchSection("blog")}
          />
        )}
        {activeTab === "events" && (
          <EventsManager
            events={events}
            loading={loading}
            onRefresh={() => fetchSection("events")}
          />
        )}
        {activeTab === "learn" && (
          <LearnManager
            resources={learn}
            loading={loading}
            onRefresh={() => fetchSection("learn")}
          />
        )}
        {activeTab === "ideas" && (
          <IdeasManager
            ideas={ideas}
            loading={loading}
            onRefresh={() => fetchSection("ideas")}
          />
        )}
      </main>
    </div>
  )
}
