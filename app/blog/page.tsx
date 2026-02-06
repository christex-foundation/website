import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Calendar, User, ArrowUpRight, Filter, Search } from "lucide-react"
import Link from "next/link"
import { getBlogPosts, BlogPost } from "@/lib/airtable"
import { Button } from "@/components/ui/button"

export default async function BlogPage() {
    const posts = await getBlogPosts()

    // Designate the first post as "Featured"
    const featuredPost = posts[0]
    const recentPosts = posts.slice(1)

    // Extract unique categories for filter (mock implementation for now)
    const categories = ["All", ...Array.from(new Set(posts.map(p => p.category)))]

    return (
        <main className="min-h-screen bg-background text-foreground">
            <Header />

            {/* Featured Section */}
            {featuredPost && (
                <section className="pt-32 pb-16 px-6 lg:px-12 border-b border-border">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-5xl md:text-7xl font-bold mb-12">News & Insights</h1>

                        <div className="grid lg:grid-cols-2 gap-12 items-center group cursor-pointer">
                            <Link href={`/blog/${featuredPost.slug}`} className="aspect-[16/10] bg-muted rounded-2xl overflow-hidden relative border border-border block">
                                {featuredPost.imageUrl ? (
                                    <img src={featuredPost.imageUrl} alt={featuredPost.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full bg-neutral-900 group-hover:scale-105 transition-transform duration-500" />
                                )}
                            </Link>

                            <div className="flex flex-col justify-center">
                                <div className="inline-flex items-center gap-2 mb-4">
                                    <span className="px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider">
                                        Featured
                                    </span>
                                    <span className="text-sm text-muted-foreground font-mono">{featuredPost.date}</span>
                                </div>

                                <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight group-hover:text-primary transition-colors">
                                    <Link href={`/blog/${featuredPost.slug}`}>
                                        {featuredPost.title}
                                    </Link>
                                </h2>

                                <p className="text-lg text-muted-foreground mb-8 line-clamp-3">
                                    {featuredPost.excerpt}
                                </p>

                                <div className="flex items-center gap-3">
                                    {featuredPost.author && (
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                            <User className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        {featuredPost.author && (
                                            <span className="text-sm font-medium">{featuredPost.author}</span>
                                        )}
                                        <span className="text-xs text-muted-foreground">{featuredPost.readTime}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Navigation / Filter Bar */}
            <section className="py-8 px-6 lg:px-12 border-b border-border sticky top-16 z-40 bg-background/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                    {/* Categories */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                        <Filter className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
                        {categories.map((cat, i) => (
                            <Button
                                key={cat}
                                variant={i === 0 ? "secondary" : "ghost"}
                                className="rounded-full font-mono text-xs uppercase h-8"
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>

                    {/* Simple Search Mockup to imply navigation capability */}
                    <div className="hidden md:flex items-center relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search articles..."
                            className="w-full bg-muted/50 border border-border rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
            </section>

            {/* Latest Posts Grid */}
            <section className="py-20 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-baseline gap-4">
                            <h3 className="text-2xl font-bold">Latest Updates</h3>
                            <span className="text-sm text-muted-foreground font-mono">{recentPosts.length} Articles</span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                        {recentPosts.map((post) => (
                            <article key={post.id} className="group flex flex-col h-full cursor-pointer">
                                {/* Image Placeholder */}
                                <Link href={`/blog/${post.slug}`} className="block overflow-hidden rounded-2xl mb-6 relative aspect-[16/10] border border-border">
                                    {post.imageUrl ? (
                                        <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full bg-neutral-900 group-hover:scale-105 transition-transform duration-500" />
                                    )}
                                    <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider border border-border">
                                        {post.category}
                                    </div>
                                </Link>

                                <div className="flex-1 flex flex-col">
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 font-mono">
                                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {post.date}</span>
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                        <span>{post.readTime}</span>
                                    </div>

                                    <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                        <Link href={`/blog/${post.slug}`} className="focus:outline-none">
                                            {post.title}
                                        </Link>
                                    </h2>

                                    <p className="text-muted-foreground mb-6 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    )
}
