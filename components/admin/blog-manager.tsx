"use client"

import { useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import {
  ArrowLeft,
  Bold,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  FileEdit,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  PenLine,
  Plus,
  Quote,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react"
import type { AdminAttachment, AdminBlogRecord } from "@/lib/airtable-admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SharePostButton, buildPostUrl } from "@/components/share-post-button"
import {
  type PreparedImage,
  prepareImageForUpload,
  slugify,
  todayISO,
  uploadImageToRecord,
} from "./image-utils"

const DEFAULT_CATEGORIES = ["Blockchain", "AI & Society", "Announcements", "Community"]

interface BlogManagerProps {
  posts: AdminBlogRecord[]
  loading: boolean
  onRefresh: () => Promise<void>
}

interface BlogFormState {
  id: string | null
  title: string
  slug: string
  slugTouched: boolean
  status: "Draft" | "Published"
  date: string
  category: string
  author: string
  excerpt: string
  content: string
  videoUrl: string
  readTime: string
  existingCover: AdminAttachment | null
  pendingCover: PreparedImage | null
  coverRemoved: boolean
  existingInlineImages: AdminAttachment[]
  pendingInlineImages: PreparedImage[]
}

function emptyForm(): BlogFormState {
  return {
    id: null,
    title: "",
    slug: "",
    slugTouched: false,
    status: "Draft",
    date: todayISO(),
    category: "Announcements",
    author: "Christex Team",
    excerpt: "",
    content: "",
    videoUrl: "",
    readTime: "",
    existingCover: null,
    pendingCover: null,
    coverRemoved: false,
    existingInlineImages: [],
    pendingInlineImages: [],
  }
}

function recordToForm(post: AdminBlogRecord): BlogFormState {
  const normalizedStatus = post.status?.toLowerCase() === "draft" ? "Draft" : "Published"
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    slugTouched: true,
    status: normalizedStatus,
    date: post.date || todayISO(),
    category: post.category || "Announcements",
    author: post.author || "",
    excerpt: post.excerpt || "",
    content: post.content || "",
    videoUrl: post.videoUrl || "",
    readTime: post.readTime || "",
    existingCover: post.image[0] || null,
    pendingCover: null,
    coverRemoved: false,
    existingInlineImages: post.contentImages || [],
    pendingInlineImages: [],
  }
}

function getYoutubeEmbedUrl(url: string): string | null {
  const ytRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  const match = url.match(ytRegex)
  if (!match && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return `https://www.youtube.com/embed/${url}`
  }
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}?autoplay=0` : null
}

export function BlogManager({ posts, loading, onRefresh }: BlogManagerProps) {
  const [mode, setMode] = useState<"list" | "edit">("list")
  const [form, setForm] = useState<BlogFormState>(emptyForm)
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write")
  const [showExtras, setShowExtras] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "Published" | "Draft">("all")
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState(false)
  const [videoPromptOpen, setVideoPromptOpen] = useState(false)
  const [videoPromptUrl, setVideoPromptUrl] = useState("")

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const inlineInputRef = useRef<HTMLInputElement | null>(null)

  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...posts.map((p) => p.category).filter(Boolean)])
  )

  const filteredPosts = posts.filter((post) => {
    const isDraft = post.status?.toLowerCase() === "draft"
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "Draft" && isDraft) ||
      (statusFilter === "Published" && !isDraft)
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      post.title.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q) ||
      post.author.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const openNew = () => {
    setForm(emptyForm())
    setEditorTab("write")
    setShowExtras(false)
    setCustomCategory(false)
    setMode("edit")
  }

  const openEdit = (post: AdminBlogRecord) => {
    setForm(recordToForm(post))
    setEditorTab("write")
    setShowExtras(Boolean(post.excerpt || post.readTime || post.videoUrl))
    setCustomCategory(Boolean(post.category && !categories.includes(post.category)))
    setMode("edit")
  }

  const insertAtCursor = (before: string, after = "", placeholder = "") => {
    const el = textareaRef.current
    if (!el) {
      setForm((prev) => ({
        ...prev,
        content: `${prev.content}${before}${placeholder}${after}`,
      }))
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = form.content.slice(start, end) || placeholder
    const next =
      form.content.slice(0, start) + before + selected + after + form.content.slice(end)
    setForm((prev) => ({ ...prev, content: next }))
    requestAnimationFrame(() => {
      el.focus()
      const cursorStart = start + before.length
      el.setSelectionRange(cursorStart, cursorStart + selected.length)
    })
  }

  const handleCoverSelect = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    try {
      const prepared = await prepareImageForUpload(file)
      setForm((prev) => ({ ...prev, pendingCover: prepared, coverRemoved: false }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not process image.")
    }
  }

  const handleInlineImagesSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const preparedList: PreparedImage[] = []
      for (const file of Array.from(files)) {
        preparedList.push(await prepareImageForUpload(file))
      }
      setForm((prev) => ({
        ...prev,
        pendingInlineImages: [...prev.pendingInlineImages, ...preparedList],
      }))
      toast.success(
        `Added ${preparedList.length} inline ${preparedList.length === 1 ? "photo" : "photos"}. Click "Insert" to place in your article.`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not process image.")
    }
  }

  const handleSave = async (targetStatus: "Draft" | "Published") => {
    if (!form.title.trim()) {
      toast.error("Please add a title for your article.")
      return
    }
    if (!form.content.trim()) {
      toast.error("Please write some article content before saving.")
      return
    }

    const finalSlug = (form.slug.trim() || slugify(form.title))
    setSaving(true)

    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        slug: finalSlug,
        status: targetStatus,
        date: form.date || todayISO(),
        category: form.category.trim() || "Announcements",
        author: form.author.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content,
        videoUrl: form.videoUrl.trim(),
        readTime: form.readTime.trim(),
      }

      if (form.id) {
        if (form.coverRemoved && !form.pendingCover) {
          payload.image = []
        }
        payload.contentImages = form.existingInlineImages.map((img) => ({ id: img.id }))
      }

      const url = form.id ? `/api/admin/blog/${form.id}` : "/api/admin/blog"
      const method = form.id ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save blog post.")
      }

      let savedRecord = data.record as AdminBlogRecord

      // Upload cover photo if a new one was chosen
      if (form.pendingCover) {
        savedRecord = await uploadImageToRecord<AdminBlogRecord>({
          section: "blog",
          recordId: savedRecord.id,
          fieldName: "Image",
          image: form.pendingCover,
          replace: true,
        })
      }

      // Upload any queued inline photos in order so {{image:N}} indices match
      for (const inlineImg of form.pendingInlineImages) {
        savedRecord = await uploadImageToRecord<AdminBlogRecord>({
          section: "blog",
          recordId: savedRecord.id,
          fieldName: "ContentImages",
          image: inlineImg,
          replace: false,
        })
      }

      await onRefresh()
      setForm(recordToForm(savedRecord))
      if (targetStatus === "Published") {
        const shareSlug = savedRecord.slug || savedRecord.id
        toast.success("Article published! It is now live on the website.", {
          action: {
            label: "Copy link",
            onClick: () => {
              navigator.clipboard?.writeText(buildPostUrl(shareSlug))
              toast.success("Article link copied!")
            },
          },
        })
      } else {
        toast.success("Draft saved safely (hidden from the live site).")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save article.")
    } finally {
      setSaving(false)
    }
  }

  const handleQuickToggleStatus = async (post: AdminBlogRecord) => {
    const nextStatus = post.status?.toLowerCase() === "draft" ? "Published" : "Draft"
    setBusyId(post.id)
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update status.")
      await onRefresh()
      toast.success(nextStatus === "Published" ? `"${post.title}" is now live.` : `"${post.title}" moved to Drafts.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status.")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (post: AdminBlogRecord) => {
    if (!window.confirm(`Delete "${post.title}" permanently? This cannot be undone.`)) return
    setBusyId(post.id)
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete post.")
      await onRefresh()
      toast.success("Article deleted.")
      if (form.id === post.id) setMode("list")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete article.")
    } finally {
      setBusyId(null)
    }
  }

  // Combine existing + pending inline images for preview & index badges
  const allInlineImages = [
    ...form.existingInlineImages.map((img) => ({
      kind: "existing" as const,
      key: img.id,
      url: img.url,
      name: img.filename,
    })),
    ...form.pendingInlineImages.map((img, i) => ({
      kind: "pending" as const,
      key: `pending-${i}`,
      pendingIndex: i,
      url: img.previewUrl,
      name: img.filename,
    })),
  ]

  const coverPreviewUrl = form.pendingCover
    ? form.pendingCover.previewUrl
    : form.coverRemoved
      ? null
      : form.existingCover?.url || null

  const buildPreviewMarkdown = () => {
    let md = form.content || ""
    allInlineImages.forEach((img, idx) => {
      const tag = `{{image:${idx + 1}}}`
      md = md.replace(new RegExp(tag, "g"), `![Article photo ${idx + 1}](${img.url})`)
    })
    if (form.videoUrl.trim()) {
      md = md.replace(/{{video}}/g, `![youtube-embed](${form.videoUrl.trim()})`)
    }
    md = md.replace(/{{video:(https?:\/\/[^}]+)}}/g, "![youtube-embed]($1)")
    return md
  }

  if (mode === "edit") {
    return (
      <div className="space-y-6">
        {/* Top Editor Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setMode("list")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              All Articles
            </Button>
            <span className="text-border">|</span>
            <h2 className="text-lg font-semibold">
              {form.id ? "Edit Article" : "New Article"}
            </h2>
            <span
              className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                form.status === "Published"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              {form.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {form.id && form.status === "Published" && form.slug && (
              <>
                <SharePostButton
                  title={form.title}
                  slug={form.slug}
                  excerpt={form.excerpt}
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                />
                <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <a href={`/blog/${encodeURIComponent(form.slug)}`} target="_blank" rel="noreferrer">
                    View Live
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => handleSave("Draft")}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Draft
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={() => handleSave("Published")}
              className="bg-primary text-primary-foreground"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {form.id && form.status === "Published" ? "Update Live Post" : "Publish Now"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Writing Column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="blog-title">Headline *</Label>
              <Input
                id="blog-title"
                placeholder="e.g. How Christex Foundation Is Scaling AI Literacy in Sierra Leone"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    title,
                    slug: prev.slugTouched ? prev.slug : slugify(title),
                  }))
                }}
                className="text-base h-11 bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-slug" className="text-xs text-muted-foreground font-mono">
                Article URL
              </Label>
              <div className="flex items-center rounded-md border border-border bg-card overflow-hidden">
                <span className="px-3 text-xs font-mono text-muted-foreground bg-muted/40 h-9 flex items-center border-r border-border">
                  /blog/
                </span>
                <input
                  id="blog-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      slug: slugify(e.target.value),
                      slugTouched: true,
                    }))
                  }
                  placeholder="auto-generated-from-title"
                  className="flex-1 bg-transparent px-3 h-9 text-sm font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Editor Toolbar & Write/Preview Tabs */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/20">
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    title="Section Heading"
                    onClick={() => insertAtCursor("\n## ", "\n", "Section Heading")}
                  >
                    <Heading2 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    title="Subheading"
                    onClick={() => insertAtCursor("\n### ", "\n", "Subheading")}
                  >
                    <Heading3 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    title="Bold"
                    onClick={() => insertAtCursor("**", "**", "bold text")}
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    title="Italic"
                    onClick={() => insertAtCursor("*", "*", "italic text")}
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    title="Bullet list"
                    onClick={() => insertAtCursor("\n- ", "", "List item")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    title="Numbered list"
                    onClick={() => insertAtCursor("\n1. ", "", "First item")}
                  >
                    <ListOrdered className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    title="Quote"
                    onClick={() => insertAtCursor("\n> ", "\n", "Highlighted quote")}
                  >
                    <Quote className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    title="Add Link"
                    onClick={() => insertAtCursor("[", "](https://example.com)", "link text")}
                  >
                    <Link2 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-1 text-xs"
                    title="Embed YouTube Video"
                    onClick={() => setVideoPromptOpen((v) => !v)}
                  >
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">YouTube</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-1 text-xs"
                    title="Upload inline photo"
                    onClick={() => inlineInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Photo</span>
                  </Button>
                </div>

                <div className="flex items-center rounded-lg bg-background p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => setEditorTab("write")}
                    className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1.5 transition-colors ${
                      editorTab === "write"
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("preview")}
                    className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1.5 transition-colors ${
                      editorTab === "preview"
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                </div>
              </div>

              {videoPromptOpen && (
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border">
                  <Input
                    placeholder="Paste YouTube URL (e.g. https://youtu.be/...)"
                    value={videoPromptUrl}
                    onChange={(e) => setVideoPromptUrl(e.target.value)}
                    className="flex-1 min-w-[220px] h-8 text-xs bg-background"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      if (!videoPromptUrl.trim()) return
                      insertAtCursor(`\n{{video:${videoPromptUrl.trim()}}}\n`)
                      setVideoPromptUrl("")
                      setVideoPromptOpen(false)
                    }}
                  >
                    Insert Video
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => setVideoPromptOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {editorTab === "write" ? (
                <Textarea
                  ref={textareaRef}
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your article here... Use the toolbar above for headings, bold text, bullet lists, YouTube videos, or inline photos."
                  className="min-h-[420px] border-0 rounded-none focus-visible:ring-0 bg-transparent p-4 text-sm leading-relaxed resize-y"
                />
              ) : (
                <div className="min-h-[420px] p-6 space-y-6 bg-background/40">
                  {coverPreviewUrl && (
                    <div className="rounded-xl overflow-hidden aspect-video border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverPreviewUrl}
                        alt={form.title || "Cover preview"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <h1 className="text-3xl font-bold">{form.title || "Untitled Article"}</h1>
                  <div className="prose prose-invert max-w-none">
                    {form.content.trim() ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: ({ alt, src }) => {
                            const srcStr = typeof src === "string" ? src : ""
                            if (alt === "youtube-embed" && srcStr) {
                              const embedUrl = getYoutubeEmbedUrl(srcStr)
                              if (embedUrl) {
                                return (
                                  <div className="my-6 rounded-xl overflow-hidden aspect-video border border-border bg-black">
                                    <iframe
                                      src={embedUrl}
                                      title="YouTube Preview"
                                      className="w-full h-full"
                                      allowFullScreen
                                    />
                                  </div>
                                )
                              }
                            }
                            return (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={srcStr}
                                alt={alt || ""}
                                className="my-6 rounded-xl border border-border w-full h-auto"
                              />
                            )
                          },
                          h2: (props) => <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground" {...props} />,
                          h3: (props) => <h3 className="text-xl font-bold mt-6 mb-3 text-foreground" {...props} />,
                          p: (props) => <p className="text-muted-foreground leading-relaxed mb-4" {...props} />,
                          a: (props) => <a className="text-primary underline" {...props} />,
                          ul: (props) => <ul className="list-disc ml-6 mb-4 text-muted-foreground" {...props} />,
                          ol: (props) => <ol className="list-decimal ml-6 mb-4 text-muted-foreground" {...props} />,
                        }}
                      >
                        {buildPreviewMarkdown()}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground italic">Nothing written yet — switch to Write to start drafting.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Inline Photos Manager */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Inline Article Photos</h3>
                  <p className="text-xs text-muted-foreground">
                    Upload photos to place inside your article body using the &quot;Insert&quot; button.
                  </p>
                </div>
                <input
                  ref={inlineInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleInlineImagesSelect(e.target.files)
                    e.target.value = ""
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => inlineInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Add Photos
                </Button>
              </div>

              {allInlineImages.length > 0 && (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {allInlineImages.map((img, idx) => (
                    <div
                      key={img.key}
                      className="rounded-lg border border-border overflow-hidden bg-background flex flex-col"
                    >
                      <div className="relative aspect-video bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1.5 left-1.5 text-[10px] font-mono bg-black/80 text-white px-2 py-0.5 rounded">
                          Photo {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (img.kind === "existing") {
                              setForm((prev) => ({
                                ...prev,
                                existingInlineImages: prev.existingInlineImages.filter(
                                  (item) => item.id !== img.key
                                ),
                              }))
                            } else {
                              setForm((prev) => ({
                                ...prev,
                                pendingInlineImages: prev.pendingInlineImages.filter(
                                  (_, pIdx) => pIdx !== img.pendingIndex
                                ),
                              }))
                            }
                          }}
                          className="absolute top-1.5 right-1.5 bg-black/80 hover:bg-red-600 text-white p-1 rounded"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate">{img.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2 shrink-0"
                          onClick={() => {
                            setEditorTab("write")
                            insertAtCursor(`\n{{image:${idx + 1}}}\n`)
                            toast.success(`Inserted Photo ${idx + 1} into article.`)
                          }}
                        >
                          Insert
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Settings Sidebar */}
          <div className="space-y-5">
            {/* Cover Image Card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Label>Cover Image</Label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleCoverSelect(e.target.files)
                  e.target.value = ""
                }}
              />
              {coverPreviewUrl ? (
                <div className="space-y-2">
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPreviewUrl}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          pendingCover: null,
                          existingCover: null,
                          coverRemoved: true,
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full aspect-video rounded-lg border border-dashed border-border hover:border-primary/60 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors bg-background/50"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs">Click to upload cover photo</span>
                  <span className="text-[11px] text-muted-foreground/70">JPG, PNG, WebP (auto-optimized)</span>
                </button>
              )}
            </div>

            {/* Post Details Card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blog-category">Category</Label>
                {!customCategory ? (
                  <div className="space-y-1.5">
                    <select
                      id="blog-category"
                      value={categories.includes(form.category) ? form.category : categories[0]}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setCustomCategory(true)
                          setForm((prev) => ({ ...prev, category: "" }))
                        } else {
                          setForm((prev) => ({ ...prev, category: e.target.value }))
                        }
                      }}
                      className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__custom__">+ New category...</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="New category name"
                      value={form.category}
                      onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="h-9 bg-background"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomCategory(false)
                        setForm((prev) => ({ ...prev, category: categories[0] }))
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-author">Author</Label>
                <Input
                  id="blog-author"
                  value={form.author}
                  onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                  placeholder="e.g. Christex Team"
                  className="h-9 bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-date">Publish Date</Label>
                <Input
                  id="blog-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="h-9 bg-background"
                />
              </div>
            </div>

            {/* Optional SEO / Extras */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setShowExtras((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-muted/20 transition-colors"
              >
                <span>Optional Extras</span>
                {showExtras ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showExtras && (
                <div className="p-4 pt-1 space-y-4 border-t border-border">
                  <div className="space-y-1.5">
                    <Label htmlFor="blog-excerpt" className="text-xs">
                      Short Excerpt <span className="text-muted-foreground">(auto-generated if blank)</span>
                    </Label>
                    <Textarea
                      id="blog-excerpt"
                      value={form.excerpt}
                      onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                      placeholder="1–2 sentence summary shown on blog cards..."
                      className="min-h-[80px] text-sm bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="blog-readtime" className="text-xs">
                      Read Time <span className="text-muted-foreground">(auto-calculated if blank)</span>
                    </Label>
                    <Input
                      id="blog-readtime"
                      value={form.readTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, readTime: e.target.value }))}
                      placeholder="e.g. 5 min read"
                      className="h-9 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="blog-video" className="text-xs">
                      Default YouTube URL <span className="text-muted-foreground">(for {"{{video}}"} tag)</span>
                    </Label>
                    <Input
                      id="blog-video"
                      value={form.videoUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..."
                      className="h-9 bg-background"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Blog Articles</h2>
          <p className="text-sm text-muted-foreground">
            Write drafts, upload photos, and publish directly to /blog.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          New Article
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(["all", "Published", "Draft"] as const).map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={statusFilter === tab ? "secondary" : "ghost"}
              onClick={() => setStatusFilter(tab)}
              className="rounded-full text-xs h-8"
            >
              {tab === "all" ? `All (${posts.length})` : tab}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-card"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading articles...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <p className="text-muted-foreground">
            {posts.length === 0
              ? "No blog articles yet. Create your first post to get started."
              : "No articles match your current filter."}
          </p>
          {posts.length === 0 && (
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Write First Article
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {filteredPosts.map((post) => {
            const isDraft = post.status?.toLowerCase() === "draft"
            const thumb = post.image[0]?.url || post.contentImages[0]?.url
            return (
              <div
                key={post.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className="w-full sm:w-28 aspect-[16/10] rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                        isDraft
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {isDraft ? "Draft" : "Published"}
                    </span>
                    {post.category && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {post.category}
                      </span>
                    )}
                    {post.date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {post.date}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold truncate">{post.title || "(Untitled)"}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {post.author ? `By ${post.author}` : "No author"} · /blog/{post.slug || post.id}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={busyId === post.id}
                    onClick={() => handleQuickToggleStatus(post)}
                  >
                    {busyId === post.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isDraft ? (
                      "Publish"
                    ) : (
                      "Unpublish"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => openEdit(post)}
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  {!isDraft && (
                    <>
                      <SharePostButton
                        title={post.title}
                        slug={post.slug || post.id}
                        excerpt={post.excerpt}
                        size="icon"
                        variant="ghost"
                      />
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Open live post"
                      >
                        <a href={`/blog/${encodeURIComponent(post.slug || post.id)}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    disabled={busyId === post.id}
                    onClick={() => handleDelete(post)}
                    title="Delete article"
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
