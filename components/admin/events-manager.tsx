"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  FileEdit,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import type { AdminAttachment, AdminEventRecord } from "@/lib/airtable-admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  type PreparedImage,
  prepareImageForUpload,
  todayISO,
  uploadImageToRecord,
} from "./image-utils"

const EVENT_CATEGORIES = ["Conference", "Workshop", "Hackathon", "Meetup"]

interface EventsManagerProps {
  events: AdminEventRecord[]
  loading: boolean
  onRefresh: () => Promise<void>
}

interface EventFormState {
  id: string | null
  title: string
  date: string
  location: string
  category: string
  registrationLink: string
  description: string
  existingImage: AdminAttachment | null
  pendingImage: PreparedImage | null
  imageRemoved: boolean
}

function emptyEventForm(): EventFormState {
  return {
    id: null,
    title: "",
    date: todayISO(),
    location: "Freetown, Sierra Leone",
    category: "Workshop",
    registrationLink: "",
    description: "",
    existingImage: null,
    pendingImage: null,
    imageRemoved: false,
  }
}

export function EventsManager({ events, loading, onRefresh }: EventsManagerProps) {
  const [mode, setMode] = useState<"list" | "edit">("list")
  const [form, setForm] = useState<EventFormState>(emptyEventForm)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const today = todayISO()

  const openNew = () => {
    setForm(emptyEventForm())
    setMode("edit")
  }

  const openEdit = (ev: AdminEventRecord) => {
    setForm({
      id: ev.id,
      title: ev.title,
      date: ev.date || todayISO(),
      location: ev.location || "",
      category: ev.category || "Workshop",
      registrationLink: ev.registrationLink || "",
      description: ev.description || "",
      existingImage: ev.image[0] || null,
      pendingImage: null,
      imageRemoved: false,
    })
    setMode("edit")
  }

  const handleImagePick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    try {
      const prepared = await prepareImageForUpload(file)
      setForm((prev) => ({ ...prev, pendingImage: prepared, imageRemoved: false }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not process image.")
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) {
      toast.error("Please enter an event title and date.")
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        date: form.date,
        location: form.location.trim(),
        category: form.category.trim(),
        registrationLink: form.registrationLink.trim(),
        description: form.description.trim(),
      }
      if (form.id && form.imageRemoved && !form.pendingImage) {
        payload.image = []
      }

      const url = form.id ? `/api/admin/events/${form.id}` : "/api/admin/events"
      const method = form.id ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save event.")

      const saved = data.record as AdminEventRecord
      if (form.pendingImage) {
        await uploadImageToRecord<AdminEventRecord>({
          section: "events",
          recordId: saved.id,
          fieldName: "Image",
          image: form.pendingImage,
          replace: true,
        })
      }

      await onRefresh()
      toast.success(form.id ? "Event updated." : "Event created.")
      setMode("list")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save event.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ev: AdminEventRecord) => {
    if (!window.confirm(`Delete event "${ev.title}"?`)) return
    setBusyId(ev.id)
    try {
      const res = await fetch(`/api/admin/events/${ev.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete event.")
      await onRefresh()
      toast.success("Event deleted.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete event.")
    } finally {
      setBusyId(null)
    }
  }

  const previewUrl = form.pendingImage
    ? form.pendingImage.previewUrl
    : form.imageRemoved
      ? null
      : form.existingImage?.url || null

  if (mode === "edit") {
    return (
      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode("list")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              All Events
            </Button>
            <h2 className="text-lg font-semibold">{form.id ? "Edit Event" : "New Event"}</h2>
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {form.id ? "Save Changes" : "Create Event"}
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="ev-title">Event Title *</Label>
            <Input
              id="ev-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. AI & Blockchain Builders Workshop"
              required
              className="bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-date">Date *</Label>
            <Input
              id="ev-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              required
              className="bg-card"
            />
            <p className="text-[11px] text-muted-foreground">
              Only upcoming (future) dates appear on /events.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-category">Category</Label>
            <select
              id="ev-category"
              value={EVENT_CATEGORIES.includes(form.category) ? form.category : EVENT_CATEGORIES[0]}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm"
            >
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-location">Location</Label>
            <Input
              id="ev-location"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="Freetown, Sierra Leone or Virtual"
              className="bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-link">Registration / RSVP Link</Label>
            <Input
              id="ev-link"
              type="url"
              value={form.registrationLink}
              onChange={(e) => setForm((p) => ({ ...p, registrationLink: e.target.value }))}
              placeholder="https://lu.ma/..."
              className="bg-card"
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea
              id="ev-desc"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What is this event about, and who should attend?"
              className="min-h-[120px] bg-card"
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Event Cover Image</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleImagePick(e.target.files)
                e.target.value = ""
              }}
            />
            {previewUrl ? (
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-full sm:w-64 aspect-video rounded-lg overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Event cover" className="w-full h-full object-cover" />
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
                      setForm((p) => ({ ...p, pendingImage: null, existingImage: null, imageRemoved: true }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Event Banner
              </Button>
            )}
          </div>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Events</h2>
          <p className="text-sm text-muted-foreground">
            Upcoming events appear on /events and automatically feature in the site header within 14 days.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          New Event
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <p className="text-muted-foreground">No events added yet.</p>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Add First Event
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {events.map((ev) => {
            const isUpcoming = Boolean(ev.date && ev.date > today)
            return (
              <div
                key={ev.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                        isUpcoming
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                      }`}
                    >
                      {isUpcoming ? "Upcoming" : "Past"}
                    </span>
                    {ev.category && (
                      <span className="text-xs font-mono text-muted-foreground">{ev.category}</span>
                    )}
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {ev.date || "No date"}
                    </span>
                    {ev.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold truncate">{ev.title}</h3>
                  {ev.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{ev.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {ev.registrationLink && (
                    <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" title="Registration link">
                      <a href={ev.registrationLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs" onClick={() => openEdit(ev)}>
                    <FileEdit className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    disabled={busyId === ev.id}
                    onClick={() => handleDelete(ev)}
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
