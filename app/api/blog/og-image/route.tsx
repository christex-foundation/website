import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"
import { getBlogPostBySlug, getBlogPosts } from "@/lib/airtable"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const rawSlug = request.nextUrl.searchParams.get("slug") || ""
  const decodedSlug = decodeURIComponent(rawSlug)

  let post = rawSlug ? await getBlogPostBySlug(decodedSlug) : null
  if (!post && rawSlug) {
    const all = await getBlogPosts()
    post = all.find((p) => p.slug === rawSlug || p.slug === decodedSlug) || null
  }

  // If the post has an article cover image, fetch the fresh Airtable URL server-side
  // and serve it directly from a permanent, non-expiring URL on christex.foundation.
  if (post?.imageUrl) {
    try {
      const upstream = await fetch(post.imageUrl, { cache: "no-store" })
      if (upstream.ok) {
        const contentType = upstream.headers.get("content-type") || "image/jpeg"
        const buffer = await upstream.arrayBuffer()
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
          },
        })
      }
    } catch (error) {
      console.error("Failed to fetch article OG cover image, falling back to generated card:", error)
    }
  }

  // Branded 1200x630 social preview card fallback
  const title = post?.title || "News & Insights"
  const excerpt =
    post?.excerpt ||
    "Stories, updates, and insights from the Christex Foundation team and community."
  const category = post?.category || "Christex Foundation"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #09090b 0%, #111827 55%, #0a192f 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#e4e4e7",
            }}
          >
            CHRISTEX FOUNDATION
          </div>
          <div
            style={{
              fontSize: 18,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              padding: "8px 20px",
              borderRadius: 999,
              border: "1px solid rgba(56, 189, 248, 0.4)",
              background: "rgba(56, 189, 248, 0.12)",
              color: "#7dd3fc",
            }}
          >
            {category}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1020px" }}>
          <div
            style={{
              fontSize: title.length > 70 ? 44 : 56,
              fontWeight: 800,
              lineHeight: 1.12,
              color: "#ffffff",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 24,
              lineHeight: 1.45,
              color: "#a1a1aa",
            }}
          >
            {excerpt.length > 155 ? `${excerpt.slice(0, 152)}...` : excerpt}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: "24px",
            fontSize: 20,
            color: "#a1a1aa",
          }}
        >
          <span>{post?.author ? `By ${post.author}` : "christex.foundation/blog"}</span>
          <span style={{ color: "#38bdf8" }}>christex.foundation</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    }
  )
}
