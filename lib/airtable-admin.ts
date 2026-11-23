import Airtable from "airtable"
import { revalidatePath, revalidateTag } from "next/cache"

export type AdminSection = "blog" | "events" | "learn" | "ideas" | "comments"

export interface AdminAttachment {
  id: string
  url: string
  filename: string
  size?: number
  type?: string
}

export interface AdminBlogRecord {
  id: string
  title: string
  slug: string
  status: string
  date: string
  category: string
  author: string
  excerpt: string
  content: string
  videoUrl: string
  readTime: string
  image: AdminAttachment[]
  contentImages: AdminAttachment[]
}

export interface AdminEventRecord {
  id: string
  title: string
  date: string
  location: string
  description: string
  category: string
  registrationLink: string
  image: AdminAttachment[]
}

export interface AdminLearnRecord {
  id: string
  title: string
  url: string
  category: string
  featured: boolean
  thumbnailUrl: string
  description: string
  thumbnail: AdminAttachment[]
}

export interface AdminIdeaRecord {
  id: string
  title: string
  problem: string
  solution: string
  resources: string
  category: string
  status: string
  createdTime?: string
}

export interface AdminCommentRecord {
  id: string
  author: string
  body: string
  postSlug: string
  postTitle: string
  status: string
  createdTime?: string
}

function getAirtableConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!apiKey || !baseId) {
    throw new Error("Airtable credentials (AIRTABLE_API_KEY, AIRTABLE_BASE_ID) are missing.")
  }
  return { apiKey, baseId }
}

function getTableId(section: AdminSection): string {
  switch (section) {
    case "blog":
      if (!process.env.AIRTABLE_BLOG_TABLE_ID) throw new Error("AIRTABLE_BLOG_TABLE_ID is not configured.")
      return process.env.AIRTABLE_BLOG_TABLE_ID
    case "events":
      if (!process.env.AIRTABLE_EVENTS_TABLE_ID) throw new Error("AIRTABLE_EVENTS_TABLE_ID is not configured.")
      return process.env.AIRTABLE_EVENTS_TABLE_ID
    case "learn":
      if (!process.env.AIRTABLE_LEARN_TABLE_ID) throw new Error("AIRTABLE_LEARN_TABLE_ID is not configured.")
      return process.env.AIRTABLE_LEARN_TABLE_ID
    case "ideas":
      return process.env.AIRTABLE_IDEAS_TABLE_ID || "Ideas"
    case "comments":
      return process.env.AIRTABLE_COMMENTS_TABLE_ID || "Comments"
  }
}

function getBase() {
  const { apiKey, baseId } = getAirtableConfig()
  return new Airtable({ apiKey }).base(baseId)
}

function mapAttachments(raw: unknown): AdminAttachment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: String(item.id || ""),
      url: String(
        (item.thumbnails as { large?: { url?: string } } | undefined)?.large?.url ||
          item.url ||
          ""
      ),
      filename: String(item.filename || "image"),
      size: typeof item.size === "number" ? item.size : undefined,
      type: typeof item.type === "string" ? item.type : undefined,
    }))
    .filter((a) => Boolean(a.id && a.url))
}

function mapRecord(section: AdminSection, record: { id: string; _rawJson?: { createdTime?: string }; get: (key: string) => unknown }) {
  switch (section) {
    case "blog":
      return {
        id: record.id,
        title: String(record.get("Title") || ""),
        slug: String(record.get("Slug") || ""),
        status: String(record.get("Status") || "Published"),
        date: String(record.get("Date") || ""),
        category: String(record.get("Category") || ""),
        author: String(record.get("Author") || ""),
        excerpt: String(record.get("Excerpt") || ""),
        content: String(record.get("Content") || ""),
        videoUrl: String(record.get("VideoURL") || ""),
        readTime: String(record.get("ReadTime") || ""),
        image: mapAttachments(record.get("Image")),
        contentImages: mapAttachments(record.get("ContentImages")),
      } satisfies AdminBlogRecord
    case "events":
      return {
        id: record.id,
        title: String(record.get("Title") || ""),
        date: String(record.get("Date") || ""),
        location: String(record.get("Location") || ""),
        description: String(record.get("Description") || ""),
        category: String(record.get("Category") || ""),
        registrationLink: String(record.get("RegistrationLink") || ""),
        image: mapAttachments(record.get("Image")),
      } satisfies AdminEventRecord
    case "learn":
      return {
        id: record.id,
        title: String(record.get("Title") || ""),
        url: String(record.get("URL") || ""),
        category: String(record.get("Category") || ""),
        featured: Boolean(record.get("Featured")),
        thumbnailUrl: String(record.get("ThumbnailURL") || ""),
        description: String(record.get("Description") || ""),
        thumbnail: mapAttachments(record.get("Thumbnail")),
      } satisfies AdminLearnRecord
    case "ideas":
      return {
        id: record.id,
        title: String(record.get("Title") || ""),
        problem: String(record.get("Problem") || ""),
        solution: String(record.get("Solution") || ""),
        resources: String(record.get("Resources") || ""),
        category: String(record.get("Category") || ""),
        status: String(record.get("Status") || "New"),
        createdTime: record._rawJson?.createdTime,
      } satisfies AdminIdeaRecord
    case "comments":
      return {
        id: record.id,
        author: String(record.get("Author") || "Anonymous"),
        body: String(record.get("Body") || ""),
        postSlug: String(record.get("PostSlug") || ""),
        postTitle: String(record.get("PostTitle") || ""),
        status: String(record.get("Status") || "Approved"),
        createdTime: record._rawJson?.createdTime,
      } satisfies AdminCommentRecord
  }
}

export function revalidateSection(section: AdminSection) {
  if (section === "blog") {
    revalidateTag("blog", { expire: 0 })
    revalidatePath("/blog")
    revalidatePath("/blog/[slug]", "page")
    revalidatePath("/api/latest-update")
  } else if (section === "events") {
    revalidateTag("events", { expire: 0 })
    revalidatePath("/events")
    revalidatePath("/api/latest-update")
  } else if (section === "learn") {
    revalidateTag("learn", { expire: 0 })
    revalidatePath("/")
  } else if (section === "comments") {
    revalidatePath("/blog/[slug]", "page")
  }
}

export async function listAdminRecords(section: AdminSection) {
  const base = getBase()
  const tableId = getTableId(section)

  const selectOptions: { sort?: Array<{ field: string; direction: "asc" | "desc" }> } = {}
  if (section === "blog" || section === "events") {
    selectOptions.sort = [{ field: "Date", direction: "desc" }]
  } else if (section === "learn") {
    selectOptions.sort = [{ field: "Title", direction: "asc" }]
  }

  let records
  try {
    records = await base(tableId).select(selectOptions).all()
  } catch (error) {
    // Gracefully return empty list if optional Comments table hasn't been created yet
    if (section === "comments") {
      console.warn("Comments table not available yet in Airtable:", error)
      return []
    }
    throw error
  }

  const mapped = records.map((r) => mapRecord(section, r as unknown as Parameters<typeof mapRecord>[1]))

  if (section === "ideas" || section === "comments") {
    return (mapped as Array<{ createdTime?: string }>).sort((a, b) =>
      (b.createdTime || "").localeCompare(a.createdTime || "")
    )
  }

  return mapped
}

function buildAirtableFields(
  section: AdminSection,
  input: Record<string, unknown>,
  mode: "create" | "update"
): Record<string, unknown> {
  const fields: Record<string, unknown> = {}

  const setString = (airtableKey: string, inputKey: string) => {
    if (!(inputKey in input)) return
    const val = typeof input[inputKey] === "string" ? input[inputKey].trim() : ""
    if (val) {
      fields[airtableKey] = val
    } else if (mode === "update") {
      fields[airtableKey] = null
    }
  }

  const setAttachmentIds = (airtableKey: string, inputKey: string) => {
    if (!(inputKey in input)) return
    const raw = input[inputKey]
    if (Array.isArray(raw)) {
      const mapped = raw
        .map((item) =>
          typeof item === "string"
            ? { id: item }
            : item && typeof item === "object" && "id" in item
              ? { id: String((item as { id: string }).id) }
              : null
        )
        .filter(Boolean)
      if (mapped.length > 0 || mode === "update") {
        fields[airtableKey] = mapped
      }
    }
  }

  if (section === "blog") {
    setString("Title", "title")
    setString("Slug", "slug")
    setString("Status", "status")
    setString("Date", "date")
    setString("Category", "category")
    setString("Author", "author")
    setString("Excerpt", "excerpt")
    if ("content" in input && typeof input.content === "string") {
      if (input.content || mode === "update") {
        fields["Content"] = input.content
      }
    }
    setString("VideoURL", "videoUrl")
    setString("ReadTime", "readTime")
    setAttachmentIds("Image", "image")
    setAttachmentIds("ContentImages", "contentImages")
  } else if (section === "events") {
    setString("Title", "title")
    setString("Date", "date")
    setString("Location", "location")
    setString("Description", "description")
    setString("Category", "category")
    setString("RegistrationLink", "registrationLink")
    setAttachmentIds("Image", "image")
  } else if (section === "learn") {
    setString("Title", "title")
    setString("URL", "url")
    setString("Category", "category")
    if ("featured" in input) {
      fields["Featured"] = Boolean(input.featured)
    }
    setString("ThumbnailURL", "thumbnailUrl")
    setString("Description", "description")
    setAttachmentIds("Thumbnail", "thumbnail")
  } else if (section === "ideas") {
    setString("Title", "title")
    setString("Problem", "problem")
    setString("Solution", "solution")
    setString("Resources", "resources")
    setString("Category", "category")
    setString("Status", "status")
  } else if (section === "comments") {
    setString("Author", "author")
    setString("Body", "body")
    setString("PostSlug", "postSlug")
    setString("PostTitle", "postTitle")
    setString("Status", "status")
  }

  return fields
}

export async function createAdminRecord(section: AdminSection, input: Record<string, unknown>) {
  const base = getBase()
  const tableId = getTableId(section)
  const fields = buildAirtableFields(section, input, "create")

  const created = await base(tableId).create([{ fields: fields as Airtable.FieldSet }], { typecast: true })
  revalidateSection(section)
  return mapRecord(section, created[0] as unknown as Parameters<typeof mapRecord>[1])
}

export async function updateAdminRecord(section: AdminSection, recordId: string, input: Record<string, unknown>) {
  const base = getBase()
  const tableId = getTableId(section)
  const fields = buildAirtableFields(section, input, "update")

  const updated = await base(tableId).update([{ id: recordId, fields: fields as Airtable.FieldSet }], { typecast: true })
  revalidateSection(section)
  return mapRecord(section, updated[0] as unknown as Parameters<typeof mapRecord>[1])
}

export async function deleteAdminRecord(section: AdminSection, recordId: string) {
  const base = getBase()
  const tableId = getTableId(section)
  await base(tableId).destroy([recordId])
  revalidateSection(section)
}

const ALLOWED_ATTACHMENT_FIELDS: Record<AdminSection, string[]> = {
  blog: ["Image", "ContentImages"],
  events: ["Image"],
  learn: ["Thumbnail"],
  ideas: [],
  comments: [],
}

export async function uploadAdminAttachment(params: {
  section: AdminSection
  recordId: string
  fieldName: string
  filename: string
  contentType: string
  base64: string
  replace?: boolean
}) {
  const { section, recordId, fieldName, filename, contentType, base64, replace } = params
  if (!ALLOWED_ATTACHMENT_FIELDS[section].includes(fieldName)) {
    throw new Error(`Field "${fieldName}" is not a valid attachment field for "${section}".`)
  }

  const { apiKey, baseId } = getAirtableConfig()
  const base = getBase()
  const tableId = getTableId(section)

  // When replacing a single cover image, clear existing attachments first because
  // Airtable's uploadAttachment endpoint always appends.
  if (replace) {
    await base(tableId).update([{ id: recordId, fields: { [fieldName]: [] } }])
  }

  const uploadUrl = `https://content.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(recordId)}/${encodeURIComponent(fieldName)}/uploadAttachment`

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contentType,
      file: base64,
      filename,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Attachment upload failed (${res.status}): ${errText}`)
  }

  // Re-fetch record so we return the normalized AdminRecord with fresh attachment URLs
  const refreshed = await base(tableId).find(recordId)
  revalidateSection(section)
  return mapRecord(section, refreshed as unknown as Parameters<typeof mapRecord>[1])
}
