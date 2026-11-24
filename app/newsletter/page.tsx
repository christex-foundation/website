import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, CheckCircle2, Mail, Sparkles, ShieldCheck, BookOpen } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { NewsletterSubscribeCard } from "@/components/newsletter-subscribe-card"
import { getBlogPosts } from "@/lib/airtable"

export const metadata: Metadata = {
  title: "Newsletter",
  description:
    "Subscribe to the Christex Foundation newsletter to receive new articles on AI, blockchain, venture building, and Sierra Leone's tech ecosystem.",
  alternates: {
    canonical: "/newsletter",
  },
  openGraph: {
    title: "Newsletter | Christex Foundation",
    description:
      "Get notified whenever Christex Foundation publishes a new article on AI, blockchain, and Sierra Leone's innovation ecosystem.",
    url: "https://christex.foundation/newsletter",
    type: "website",
  },
}

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ unsubscribed?: string; email?: string }>
}) {
  const [{ unsubscribed, email }, posts] = await Promise.all([
    searchParams,
    getBlogPosts(),
  ])

  const recentPosts = posts.slice(0, 3)

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 lg:px-12 relative border-b border-border">
        <div
          aria-hidden="true"
          className="absolute top-20 -right-24 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none"
        />

        <div className="max-w-4xl mx-auto relative z-10 space-y-8">
          {unsubscribed === "1" && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-100">You&apos;ve been unsubscribed.</p>
                <p className="text-emerald-200/80 text-xs mt-0.5">
                  {email ? `${email} will no longer receive newsletter emails.` : "You will no longer receive newsletter emails."}{" "}
                  Changed your mind? You can re-subscribe anytime below.
                </p>
              </div>
            </div>
          )}

          {unsubscribed === "invalid" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              That unsubscribe link looks invalid or expired. If you still want to be removed, reply to any newsletter email or reach out at hello@christex.foundation.
            </div>
          )}

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <Mail className="w-3.5 h-3.5 text-primary" />
              Christex Dispatches
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
              Stories from Sierra Leone&apos;s innovation frontier.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Join builders, founders, students, and partners who get an email whenever we publish a new article from the Christex Foundation team.
            </p>
          </div>

          <NewsletterSubscribeCard
            variant="hero"
            source="newsletter-page"
            heading="Subscribe for new articles"
            description="Enter your email below and we'll send you every new post as soon as it goes live."
          />

          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <div className="text-sm font-semibold">Fresh Articles First</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get notified immediately when we publish deep dives on AI, blockchain, and ecosystem updates.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-1.5">
              <BookOpen className="w-4 h-4 text-primary" />
              <div className="text-sm font-semibold">Signal Over Noise</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We only email when there&apos;s a genuine new story worth reading — never daily spam.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div className="text-sm font-semibold">One-Click Unsubscribe</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your email stays private with Christex Foundation and you can opt out anytime in one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Articles Preview */}
      {recentPosts.length > 0 && (
        <section className="py-16 px-6 lg:px-12">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  Recent Dispatches
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  See what you&apos;ll receive
                </h2>
              </div>
              <Link
                href="/blog"
                className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                All Articles
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/40 transition-colors"
                >
                  <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                    {post.imageUrl ? (
                      <Image
                        src={post.imageUrl}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-900" />
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground mb-2">
                      {post.category && (
                        <span className="text-primary uppercase">{post.category}</span>
                      )}
                      {post.date && <span>· {post.date}</span>}
                    </div>
                    <h3 className="font-semibold text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 mt-auto">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  )
}
