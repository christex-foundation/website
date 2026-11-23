"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  ExternalLink,
  FileEdit,
  Loader2,
  Plus,
  Star,
  Trash2,
  Upload,
} from "lucide-react"
import type { AdminAttachment, AdminLearnRecord } from "@/lib/airtable-admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  type PreparedImage,
  prepareImageForUpload,
  uploadImageToRecord,
} from "./image-utils"

const LEARN_CATEGORIES = ["Blockchain", "AI", "Development", "Design", "General"]

interface LearnManagerProps {
  resources: AdminLearnRecord[]
  loading: boolean
  onRefresh: () => Promise<void>
}

interface LearnFormState {
  id: string | null
  title: string
  url: string
  category: string
  featured: boolean
  description: string
  thumbnailUrl: string
  existingThumb: AdminAttachment | null
  pendingThumb: PreparedImage | null
  thumbRemoved: boolean
}

function emptyLearnForm(): LearnFormState {
  return {
    id: null,
    title: "",
    url: "",
    category: "Blockchain",
    featured: false,
    description: "",
    thumbnailUrl: "",
    existingThumb: null,
    pendingThumb: null,
    thumbRemoved: false,
  }
}

export function LearnManager({ resources, loading, onRefresh }: LearnManagerProps) {
  const [mode, setMode] = useState<"list" | "edit">("list")
  const [form, setForm] = useState<LearnFormState>(emptyLearnForm)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const openNew = () => {
    setForm(emptyLearnForm())
    setMode("edit")
  }

  const openEdit = (item: AdminLearnRecord) => {
    setForm({
      id: item.id,
      title: item.title,
      url: item.url,
      category: item.category || "General",
      featured: item.featured,
      description: item.description || "",
      thumbnailUrl: item.thumbnailUrl || "",
      existingThumb: item.thumbnail[0] || null,
      pendingThumb: null,
      thumbRemoved: false,
    })
    setMode("edit")
  }

  const handleThumbPick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    try {
      const prepared = await prepareImageForUpload(file)
      setForm((p) => ({ ...p, pendingThumb: prepared, thumbRemoved: false }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not process image.")
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.url.trim()) {
      toast.error("Please enter a title and URL.")
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        url: form.url.trim(),
        category: form.category.trim(),
        featured: form.featured,
        description: form.description.trim(),
        thumbnailUrl: form.thumbnailUrl.trim(),
      }
      if (form.id && form.thumbRemoved && !form.pendingThumb) {
        payload.thumbnail = []
      }

      const url = form.id ? `/api/admin/learn/${form.id}` : "/api/admin/learn"
      const method = form.id ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save resource.")

      const saved = data.record as AdminLearnRecord
      if (form.pendingThumb) {
        await uploadImageToRecord<AdminLearnRecord>({
          section: "learn",
          recordId: saved.id,
          fieldName: "Thumbnail",
          image: form.pendingThumb,
          replace: true,
        })
      }

      await onRefresh()
      toast.success(form.id ? "Resource updated." : "Resource added.")
      setMode("list")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save resource.")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFeatured = async (item: AdminLearnRecord) => {
    setBusyId(item.id)
    try {
      const res = await fetch(`/api/admin/learn/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !item.featured }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update featured status.")
      await onRefresh()
      toast.success(!item.featured ? `Marked "${item.title}" as featured.` : `Unfeatured "${item.title}".`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update resource.")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (item: AdminLearnRecord) => {
    if (!window.confirm(`Delete learning resource "${item.title}"?`)) return
    setBusyId(item.id)
    try {
      const res = await fetch(`/api/admin/learn/${item.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete resource.")
      await onRefresh()
      toast.success("Resource deleted.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete resource.")
    } finally {
      setBusyId(null)
    }
  }

  const previewUrl = form.pendingThumb
    ? form.pendingThumb.previewUrl
    : form.thumbRemoved
      ? form.thumbnailUrl || null
      : form.existingThumb?.url || form.thumbnailUrl || null

  if (mode === "edit") {
    return (
      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode("list")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              All Resources
            </Button>
            <h2 className="text-lg font-semibold">
              {form.id ? "Edit Learning Resource" : "New Learning Resource"}
            </h2>
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {form.id ? "Save Changes" : "Add Resource"}
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="learn-title">Title *</Label>
            <Input
              id="learn-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Intro to Solana Development"
              required
              className="bg-card"
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="learn-url">Resource URL *</Label>
            <Input
              id="learn-url"
              type="url"
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://..."
              required
              className="bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="learn-category">Category</Label>
            <select
              id="learn-category"
              value={LEARN_CATEGORIES.includes(form.category) ? form.category : LEARN_CATEGORIES[0]}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm"
            >
              {LEARN_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
                className="w-4 h-4 accent-primary rounded"
              />
              <span>Feature in header navigation menu</span>
            </label>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="learn-desc">Short Description</Label>
            <Textarea
              id="learn-desc"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="1–2 sentences explaining what learners will gain..."
              className="min-h-[100px] bg-card"
            />
          </div>

          <div className="sm:col-span-2 space-y-3">
            <Label>Thumbnail Image</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleThumbPick(e.target.files)
                e.target.value = ""
              }}
            />
            {previewUrl ? (
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-full sm:w-56 aspect-video rounded-lg overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        pendingThumb: null,
                        existingThumb: null,
                        thumbnailUrl: "",
                        thumbRemoved: true,
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Thumbnail
              </Button>
            )}
            <div className="space-y-1">
              <Label htmlFor="learn-thumb-url" className="text-xs text-muted-foreground">
                Or paste a Thumbnail URL (optional)
              </Label>
              <Input
                id="learn-thumb-url"
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) => setForm((p) => ({ ...p, thumbnailUrl: e.target.value }))}
                placeholder="https://..."
                className="h-9 bg-card text-xs"
              />
            </div>
          </div>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Learn Resources</h2>
          <p className="text-sm text-muted-foreground">
            Curated courses, videos, and guides displayed in the website header menu.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          New Resource
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading resources...
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <p className="text-muted-foreground">No learning resources added yet.</p>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Add First Resource
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {resources.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/20 transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  {item.featured && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Featured
                    </span>
                  )}
                  {item.category && (
                    <span className="text-xs font-mono text-muted-foreground">{item.category}</span>
                  )}
                </div>
                <h3 className="font-semibold truncate">{item.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{item.url}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-8 w-8 p-0 ${item.featured ? "text-amber-400" : "text-muted-foreground"}`}
                  disabled={busyId === item.id}
                  onClick={() => handleToggleFeatured(item)}
                  title={item.featured ? "Remove from featured" : "Mark as featured"}
                >
                  <Star className={`w-4 h-4 ${item.featured ? "fill-amber-400" : ""}`} />
                </Button>
                <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" title="Open link">
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
                <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs" onClick={() => openEdit(item)}>
                  <FileEdit className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                  disabled={busyId === item.id}
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
