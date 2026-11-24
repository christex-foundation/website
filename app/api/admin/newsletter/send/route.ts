import { NextRequest, NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { getActiveSubscribers } from "@/lib/airtable"
import { getAdminBlogRecordById } from "@/lib/airtable-admin"
import {
  getSmtpConfig,
  isValidEmail,
  sendBlogNewsletter,
  stripMarkdownToExcerpt,
} from "@/lib/newsletter"

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const smtp = getSmtpConfig()
  const activeSubscribers = await getActiveSubscribers()

  return NextResponse.json({
    smtpConfigured: Boolean(smtp),
    smtpFrom: smtp?.from || null,
    smtpHost: smtp?.host || null,
    activeSubscriberCount: activeSubscribers.length,
  })
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as {
      postId?: string
      mode?: "test" | "broadcast"
      testEmail?: string
      customSubject?: string
      customIntro?: string
    }

    const postId = (body.postId || "").trim()
    const mode = body.mode === "broadcast" ? "broadcast" : "test"

    if (!/^rec[a-zA-Z0-9]+$/.test(postId)) {
      return NextResponse.json({ error: "Invalid article ID." }, { status: 400 })
    }

    const post = await getAdminBlogRecordById(postId)
    if (!post) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 })
    }

    const isDraft = post.status?.toLowerCase() === "draft"
    if (mode === "broadcast" && isDraft) {
      return NextResponse.json(
        { error: "Publish this article first before sending it to subscribers." },
        { status: 400 }
      )
    }

    const excerpt =
      post.excerpt?.trim() ||
      (post.content ? stripMarkdownToExcerpt(post.content) : "")

    const newsletterPost = {
      title: post.title,
      slug: post.slug || post.id,
      excerpt,
      category: post.category,
      author: post.author,
      date: post.date,
      hasImage: Boolean(post.image[0]?.url || post.contentImages[0]?.url),
    }

    if (mode === "test") {
      const testEmail = (body.testEmail || "").trim().toLowerCase()
      if (!testEmail || !isValidEmail(testEmail)) {
        return NextResponse.json(
          { error: "Please enter a valid email address for the test send." },
          { status: 400 }
        )
      }

      const result = await sendBlogNewsletter({
        post: newsletterPost,
        recipients: [{ email: testEmail }],
        customSubject: body.customSubject,
        customIntro: body.customIntro,
        isTest: true,
      })

      if (result.failed > 0) {
        return NextResponse.json(
          { error: result.errors[0]?.error || "Failed to send test email." },
          { status: 500 }
        )
      }

      return NextResponse.json({
        mode: "test",
        ...result,
      })
    }

    const subscribers = await getActiveSubscribers()
    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: "There are no active subscribers yet." },
        { status: 400 }
      )
    }

    const result = await sendBlogNewsletter({
      post: newsletterPost,
      recipients: subscribers.map((s) => ({ email: s.email, name: s.name })),
      customSubject: body.customSubject,
      customIntro: body.customIntro,
      isTest: false,
    })

    return NextResponse.json({
      mode: "broadcast",
      ...result,
    })
  } catch (error) {
    console.error("POST /api/admin/newsletter/send error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send newsletter." },
      { status: 500 }
    )
  }
}
