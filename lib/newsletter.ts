import crypto from "crypto"
import nodemailer from "nodemailer"

const DEFAULT_SITE_URL = "https://christex.foundation"

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL
  return raw.replace(/\/+$/, "")
}

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

export function getSmtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  if (!user || !pass) return null

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com"
  const parsedPort = Number(process.env.SMTP_PORT || 465)
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 465
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE.toLowerCase() === "true"
      : port === 465
  const from = process.env.SMTP_FROM?.trim() || `Christex Foundation <${user}>`

  return { host, port, secure, user, pass, from }
}

export function isSmtpConfigured(): boolean {
  return Boolean(getSmtpConfig())
}

function getUnsubscribeSecret(): string {
  const explicit = process.env.NEWSLETTER_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim()
  if (explicit) return explicit
  const passcode = process.env.ADMIN_PASSCODE?.trim() || ""
  const baseId = process.env.AIRTABLE_BASE_ID?.trim() || "christex-newsletter-v1"
  return crypto.createHash("sha256").update(`${passcode}:${baseId}:unsubscribe`).digest("hex")
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

export function createUnsubscribeToken(email: string): string {
  return crypto
    .createHmac("sha256", getUnsubscribeSecret())
    .update(normalizeEmail(email))
    .digest("hex")
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false
  const expected = createUnsubscribeToken(email)
  const aBuf = Buffer.from(token.trim())
  const bBuf = Buffer.from(expected)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export function buildUnsubscribeUrl(email: string): string {
  const normalized = normalizeEmail(email)
  const token = createUnsubscribeToken(normalized)
  return `${getSiteUrl()}/api/newsletter/unsubscribe?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(token)}`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function stripMarkdownToExcerpt(content: string, maxLen = 220): string {
  const plainText = content
    .replace(/^#+\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/{{image:\d+}}/g, "")
    .replace(/{{video(?::[^}]+)?}}/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (plainText.length <= maxLen) return plainText
  const cut = plainText.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(" ")
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "..."
}

export interface BlogNewsletterPost {
  title: string
  slug: string
  excerpt: string
  category?: string
  author?: string
  date?: string
  hasImage?: boolean
}

export function buildBlogNewsletterEmail(params: {
  post: BlogNewsletterPost
  recipientEmail: string
  recipientName?: string
  customSubject?: string
  customIntro?: string
  isTest?: boolean
}) {
  const { post, recipientEmail, recipientName, customSubject, customIntro, isTest } = params
  const siteUrl = getSiteUrl()
  const articleUrl = `${siteUrl}/blog/${encodeURIComponent(post.slug)}`
  // Use our permanent OG image proxy route so images never expire in subscribers' inboxes
  const coverImageUrl = `${siteUrl}/api/blog/og-image?slug=${encodeURIComponent(post.slug)}`
  const unsubscribeUrl = buildUnsubscribeUrl(recipientEmail)

  const rawSubject = customSubject?.trim() || post.title
  const subject = isTest ? `[TEST] ${rawSubject}` : rawSubject
  const summary =
    customIntro?.trim() ||
    post.excerpt?.trim() ||
    "Read the latest story and insights from the Christex Foundation."
  const category = post.category?.trim() || "New Article"
  const metaParts = [post.author?.trim() ? `By ${post.author.trim()}` : null, post.date?.trim() || null].filter(Boolean)
  const metaLine = metaParts.join("  •  ")
  const greeting = recipientName?.trim() ? `Hi ${escapeHtml(recipientName.trim())},` : ""

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(rawSubject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(summary)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0b0b0c;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#141416;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #27272a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f4f4f5;font-weight:700;">
                    CHRISTEX FOUNDATION
                  </td>
                  <td align="right" style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#38bdf8;">
                    ${escapeHtml(category)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cover Image -->
          <tr>
            <td style="padding:0;background-color:#09090b;">
              <a href="${articleUrl}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;">
                <img src="${coverImageUrl}" alt="${escapeHtml(post.title)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
              </a>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${greeting ? `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d4d4d8;">${greeting}</p>` : ""}
              <p style="margin:0 0 12px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#a1a1aa;">
                New on the Christex Blog${metaLine ? `  •  ${escapeHtml(metaLine)}` : ""}
              </p>
              <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;font-weight:700;color:#ffffff;">
                <a href="${articleUrl}" target="_blank" rel="noopener noreferrer" style="color:#ffffff;text-decoration:none;">
                  ${escapeHtml(post.title)}
                </a>
              </h1>
              <p style="margin:0 0 28px 0;font-size:16px;line-height:1.65;color:#d4d4d8;">
                ${escapeHtml(summary)}
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius:999px;background-color:#ffffff;">
                    <a href="${articleUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#09090b;text-decoration:none;">
                      Read Full Article &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #27272a;background-color:#101012;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#71717a;">
                You're receiving this email because you subscribed to updates from <strong style="color:#a1a1aa;">Christex Foundation</strong> (Freetown, Sierra Leone).
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">
                <a href="${siteUrl}/blog" target="_blank" rel="noopener noreferrer" style="color:#a1a1aa;text-decoration:underline;">Visit Blog</a>
                &nbsp;&middot;&nbsp;
                <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    recipientName?.trim() ? `Hi ${recipientName.trim()},` : null,
    `NEW ON THE CHRISTEX FOUNDATION BLOG (${category.toUpperCase()})`,
    "",
    post.title,
    metaLine || null,
    "",
    summary,
    "",
    `Read the full article: ${articleUrl}`,
    "",
    "---",
    "You're receiving this because you subscribed to the Christex Foundation newsletter.",
    `Unsubscribe anytime: ${unsubscribeUrl}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n")

  return { subject, html, text, unsubscribeUrl }
}

export function buildWelcomeEmail(params: { recipientEmail: string; recipientName?: string }) {
  const { recipientEmail, recipientName } = params
  const siteUrl = getSiteUrl()
  const unsubscribeUrl = buildUnsubscribeUrl(recipientEmail)
  const greeting = recipientName?.trim() ? `Hi ${escapeHtml(recipientName.trim())},` : "Welcome!"

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Christex Foundation</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0b0b0c;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#141416;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #27272a;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f4f4f5;font-weight:700;">
              CHRISTEX FOUNDATION
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;">
                You're subscribed!
              </h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#d4d4d8;">
                ${greeting} Thanks for joining the Christex Foundation newsletter. Whenever we publish a new article on AI, blockchain, venture building, or ecosystem updates from Sierra Leone, you'll get it straight in your inbox.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
                <tr>
                  <td align="center" style="border-radius:999px;background-color:#ffffff;">
                    <a href="${siteUrl}/blog" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#09090b;text-decoration:none;">
                      Browse Recent Articles &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #27272a;background-color:#101012;font-size:12px;color:#71717a;">
              Christex Foundation &middot; Freetown, Sierra Leone &middot;
              <a href="${unsubscribeUrl}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    recipientName?.trim() ? `Hi ${recipientName.trim()},` : "Welcome!",
    "",
    "Thanks for subscribing to the Christex Foundation newsletter.",
    "Whenever we publish a new article on AI, blockchain, venture building, or ecosystem updates from Sierra Leone, you'll receive it right in your inbox.",
    "",
    `Browse recent articles: ${siteUrl}/blog`,
    "",
    `Unsubscribe anytime: ${unsubscribeUrl}`,
  ].join("\n")

  return {
    subject: "Welcome to the Christex Foundation Newsletter",
    html,
    text,
    unsubscribeUrl,
  }
}

function createTransporter(config: SmtpConfig, pooled = false) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    ...(pooled
      ? {
          pool: true,
          maxConnections: 3,
          maxMessages: 50,
          rateDelta: 1000,
          rateLimit: 4,
        }
      : {}),
  })
}

export async function sendWelcomeEmail(params: { recipientEmail: string; recipientName?: string }) {
  const config = getSmtpConfig()
  if (!config) return { skipped: true as const }

  const transporter = createTransporter(config, false)
  const { subject, html, text, unsubscribeUrl } = buildWelcomeEmail(params)

  await transporter.sendMail({
    from: config.from,
    to: params.recipientEmail,
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })

  return { skipped: false as const }
}

export async function sendBlogNewsletter(params: {
  post: BlogNewsletterPost
  recipients: Array<{ email: string; name?: string }>
  customSubject?: string
  customIntro?: string
  isTest?: boolean
}): Promise<{
  total: number
  sent: number
  failed: number
  errors: Array<{ email: string; error: string }>
}> {
  const config = getSmtpConfig()
  if (!config) {
    throw new Error(
      "SMTP is not configured yet. Add SMTP_USER and SMTP_PASS (and optionally SMTP_HOST, SMTP_PORT, SMTP_FROM) to your environment variables."
    )
  }

  const transporter = createTransporter(config, params.recipients.length > 1)
  const errors: Array<{ email: string; error: string }> = []
  let sent = 0

  try {
    // Verify credentials once before sending a batch so bad credentials fail fast
    await transporter.verify()

    for (const recipient of params.recipients) {
      try {
        const { subject, html, text, unsubscribeUrl } = buildBlogNewsletterEmail({
          post: params.post,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          customSubject: params.customSubject,
          customIntro: params.customIntro,
          isTest: params.isTest,
        })

        await transporter.sendMail({
          from: config.from,
          to: recipient.email,
          subject,
          html,
          text,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        })
        sent++
      } catch (err) {
        errors.push({
          email: recipient.email,
          error: err instanceof Error ? err.message : "Failed to deliver email",
        })
      }
    }
  } finally {
    transporter.close()
  }

  return {
    total: params.recipients.length,
    sent,
    failed: errors.length,
    errors: errors.slice(0, 10),
  }
}
