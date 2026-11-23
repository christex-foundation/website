import type { AdminSection } from "@/lib/airtable-admin"

export interface PreparedImage {
  filename: string
  contentType: string
  base64: string
  previewUrl: string
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function todayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Could not read image file."))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not decode image."))
    img.src = src
  })
}

/**
 * Prepares an image for Airtable's uploadAttachment API (5 MB max, and Vercel's 4.5 MB body cap).
 * Automatically resizes/compresses large photos client-side while preserving small PNG/GIF/WebP files.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]
  if (!allowed.includes(file.type)) {
    throw new Error("Please select a JPG, PNG, WebP, GIF, or AVIF image.")
  }

  const MAX_RAW_BYTES = 2.4 * 1024 * 1024 // Keeps base64 payload safely under ~3.3 MB

  if (file.size <= MAX_RAW_BYTES) {
    const dataUrl = await readAsDataUrl(file)
    const base64 = dataUrl.split(",")[1] || ""
    return {
      filename: file.name,
      contentType: file.type,
      base64,
      previewUrl: dataUrl,
    }
  }

  // Downscale large images cleanly in browser canvas
  const originalUrl = await readAsDataUrl(file)
  const img = await loadImageElement(originalUrl)
  const maxDimension = 1800
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Could not initialize image compressor.")
  }
  ctx.drawImage(img, 0, 0, width, height)

  const outputType = "image/jpeg"
  let quality = 0.85
  let dataUrl = canvas.toDataURL(outputType, quality)
  let base64 = dataUrl.split(",")[1] || ""

  while ((base64.length * 3) / 4 > MAX_RAW_BYTES && quality > 0.45) {
    quality -= 0.1
    dataUrl = canvas.toDataURL(outputType, quality)
    base64 = dataUrl.split(",")[1] || ""
  }

  const safeBaseName = file.name.replace(/\.[^.]+$/, "")
  return {
    filename: `${safeBaseName}.jpg`,
    contentType: outputType,
    base64,
    previewUrl: dataUrl,
  }
}

export async function uploadImageToRecord<T>(params: {
  section: AdminSection
  recordId: string
  fieldName: string
  image: PreparedImage
  replace?: boolean
}): Promise<T> {
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      section: params.section,
      recordId: params.recordId,
      fieldName: params.fieldName,
      filename: params.image.filename,
      contentType: params.image.contentType,
      base64: params.image.base64,
      replace: Boolean(params.replace),
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Image upload failed.")
  }
  return data.record as T
}
