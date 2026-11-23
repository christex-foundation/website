import Airtable from 'airtable';

// Initialize Airtable
const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;
const eventsTableId = process.env.AIRTABLE_EVENTS_TABLE_ID;
const blogTableId = process.env.AIRTABLE_BLOG_TABLE_ID;
const galleryTableId = process.env.AIRTABLE_GALLERY_TABLE_ID;
const ideasTableId = process.env.AIRTABLE_IDEAS_TABLE_ID;
const commentsTableId = process.env.AIRTABLE_COMMENTS_TABLE_ID;

// Fail gracefully if keys are not present (during build or dev without keys)
const base = (baseId && apiKey)
    ? new Airtable({ apiKey }).base(baseId)
    : null;

export interface Event {
    id: string;
    title: string;
    date: string;
    location: string;
    description: string;
    category: string;
    imageUrl?: string;
    registrationLink?: string;
}

export interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    author: string;
    date: string;
    category: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string; // YouTube or other video link
    contentImages?: string[]; // Array of additional image URLs
    slug: string; // For SEO-friendly URLs
    readTime?: string;
    likes: number;
}

export interface BlogComment {
    id: string;
    author: string;
    body: string;
    postSlug: string;
    postTitle?: string;
    createdAt: string;
}

export interface LearnResource {
    id: string;
    title: string;
    url: string;
    category: string;
    featured?: boolean;
    thumbnail?: string;
    description?: string;
}

// Mock data for fallback
const MOCK_EVENTS: Event[] = [
    {
        id: 'mock-1',
        title: "Sierra Leone Tech Summit 2026",
        date: "2026-03-15",
        location: "Freetown, Sierra Leone",
        description: "Join us for the biggest tech gathering in West Africa, featuring keynote speakers from global tech giants.",
        category: "Conference",
        registrationLink: "#"
    },
    {
        id: 'mock-2',
        title: "AI & Blockchain Workshop",
        date: "2026-04-02",
        location: "Virtual / Discord",
        description: "A hands-on workshop diving deep into the intersection of AI agents and blockchain technology.",
        category: "Workshop",
        registrationLink: "#"
    },
];

const MOCK_NEWS: BlogPost[] = [
    {
        id: 'mock-1',
        title: "The Future of Digital Identity in West Africa",
        excerpt: "How decentralized identity solutions are empowering citizens and businesses across the region.",
        author: "Christex Team",
        date: "2026-01-12",
        category: "Blockchain",
        slug: "future-digital-identity-west-africa",
        content: `
# Digital Identity Revolution

In West Africa, the lack of formal identification systems has long been a barrier to financial inclusion and access to essential services. **Decentralized identity (DID)** solutions offer a promising path forward.

## The Problem

Traditional centralized databases are vulnerable to hacks and often exclude rural populations.

{{image:1}}

## The Solution

By leveraging blockchain technology, we can create self-sovereign identities that are owned and controlled by the user.

- **Privacy-first**: Users control who sees their data.
- **Portable**: Can be used across different services and borders.
- **Secure**: Cryptographically secured on the blockchain.

{{image:2}}

## Case Study: Sierra Leone

We heavily invested in pilot programs...
        `,
        readTime: "5 min read",
        likes: 0,
        contentImages: [
            "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&q=80&w=1000",
            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000"
        ]
    },
    {
        id: 'mock-2',
        title: "Building Resilient Communities with AI",
        excerpt: "Exploring the role of artificial intelligence in analyzing local data.",
        author: "Sarah Johnson",
        date: "2026-02-04",
        category: "AI & Society",
        slug: "building-resilient-communities-ai",
        content: "Full content would go here...",
        readTime: "8 min read",
        likes: 0
    }
];

const MOCK_LEARN_RESOURCES: LearnResource[] = [];

// Cached Data Fetching Functions using unstable_cache (bypassed in local dev so Airtable edits appear immediately)
import { unstable_cache } from 'next/cache';

async function fetchEventsRaw(): Promise<Event[]> {
    if (!base || !eventsTableId) {
        console.warn("Airtable credentials or table ID missing, using mock data for Events.");
        return MOCK_EVENTS;
    }

    try {
        const records = await base(eventsTableId).select({
            sort: [{ field: 'Date', direction: 'asc' }],
            filterByFormula: "IS_AFTER({Date}, TODAY())" // Only future events
        }).all();

        return records.map(record => ({
            id: record.id,
            title: record.get('Title') as string,
            date: record.get('Date') as string,
            location: record.get('Location') as string,
            description: record.get('Description') as string,
            category: record.get('Category') as string,
            imageUrl: (record.get('Image') as any)?.[0]?.url,
            registrationLink: record.get('RegistrationLink') as string,
        }));
    } catch (error) {
        console.error("Error fetching events from Airtable:", error);
        return MOCK_EVENTS;
    }
}

const getEventsCached = unstable_cache(
    fetchEventsRaw,
    ['events-list'],
    { tags: ['events'], revalidate: 60 }
);

export async function getEvents(): Promise<Event[]> {
    return process.env.NODE_ENV === 'development' ? fetchEventsRaw() : getEventsCached();
}

export const getGalleryImages = unstable_cache(
    async (): Promise<string[]> => {
        if (!base || !galleryTableId) {
            return [];
        }

        try {
            const records = await base(galleryTableId).select({
                maxRecords: 100,
                view: "Grid view" // Optional: specify a view if needed
            }).all();

            // Extract all images from all records
            const images: string[] = [];
            records.forEach(record => {
                const attachments = record.get('Images') as any[];
                if (attachments && Array.isArray(attachments)) {
                    attachments.forEach(photo => {
                        // Prioritize web-safe thumbnails if available (handles HEIC/DNG conversion automatically)
                        const thumbnailUrl = photo.thumbnails?.full?.url ||
                            photo.thumbnails?.large?.url ||
                            photo.thumbnails?.small?.url;

                        if (thumbnailUrl) {
                            images.push(thumbnailUrl);
                        } else {
                            // If no thumbnails exist (common for raw files like DNG/HEIC that Airtable hasn't processed yet),
                            // we MUST filter out non-web formats to avoid broken images on the frontend.
                            // Only allow fallback to raw URL for natively supported web formats.
                            const filename = photo.filename || '';
                            const type = photo.type || '';

                            const isWebSafe = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename) ||
                                /image\/(jpeg|png|gif|webp)/.test(type);

                            if (isWebSafe && photo.url) {
                                images.push(photo.url);
                            }
                        }
                    });
                }
            });

            return images;
        } catch (error) {
            console.error("Error fetching gallery images from Airtable:", error);
            return [];
        }
    },
    ['gallery-images'],
    { tags: ['gallery'], revalidate: 60 }
);

function isPublishedBlogRecord(record: { get: (field: string) => unknown }): boolean {
    const rawStatus = record.get('Status');
    if (typeof rawStatus !== 'string' || !rawStatus.trim()) {
        // Backward-compatible: if no Status column exists or it's blank, treat as published.
        return true;
    }
    return rawStatus.trim().toLowerCase() === 'published';
}

async function fetchBlogPostsRaw(): Promise<BlogPost[]> {
    if (!base || !blogTableId) {
        console.warn("Airtable credentials or table ID missing (base is null), using mock data for Blog.");
        return MOCK_NEWS;
    }

    try {
        const records = await base(blogTableId).select({
            sort: [{ field: 'Date', direction: 'desc' }],
        }).all();

        return records
            .filter(record => isPublishedBlogRecord(record))
            .map(record => mapRecordToBlogPost(record));
    } catch (error) {
        console.error("Error fetching news from Airtable:", error);
        return MOCK_NEWS;
    }
}

const getBlogPostsCached = unstable_cache(
    fetchBlogPostsRaw,
    ['blog-posts'],
    { tags: ['blog'], revalidate: 60 }
);

export async function getBlogPosts(): Promise<BlogPost[]> {
    return process.env.NODE_ENV === 'development' ? fetchBlogPostsRaw() : getBlogPostsCached();
}

async function fetchBlogPostBySlugRaw(slug: string): Promise<BlogPost | null> {
    if (!base || !blogTableId) {
        return MOCK_NEWS.find(p => p.slug === slug) || null;
    }

    try {
        const decodedSlug = decodeURIComponent(slug);
        const escapedSlug = decodedSlug.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        const records = await base(blogTableId).select({
            filterByFormula: `{Slug} = '${escapedSlug}'`,
            maxRecords: 1
        }).firstPage();

        if (records.length === 0 || !isPublishedBlogRecord(records[0])) {
            return null;
        }

        return mapRecordToBlogPost(records[0]);
    } catch (error) {
        console.error("Error fetching single post from Airtable:", error);
        return null;
    }
}

const getBlogPostBySlugCached = unstable_cache(
    fetchBlogPostBySlugRaw,
    ['blog-post-by-slug'],
    { tags: ['blog'], revalidate: 60 }
);

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    return process.env.NODE_ENV === 'development'
        ? fetchBlogPostBySlugRaw(slug)
        : getBlogPostBySlugCached(slug);
}

async function fetchLearnResourcesRaw(): Promise<LearnResource[]> {
    const learnTableId = process.env.AIRTABLE_LEARN_TABLE_ID;

    if (!base || !learnTableId) {
        return MOCK_LEARN_RESOURCES;
    }

    try {
        const records = await base(learnTableId).select({
            sort: [{ field: 'Title', direction: 'asc' }]
        }).all();

        return records.map(record => ({
            id: record.id,
            title: record.get('Title') as string,
            url: record.get('URL') as string,
            category: record.get('Category') as string,
            featured: record.get('Featured') as boolean,
            thumbnail: (record.get('Thumbnail') as any)?.[0]?.url || (record.get('ThumbnailURL') as string),
            description: record.get('Description') as string,
        }));
    } catch (error) {
        console.error("Error fetching learn resources from Airtable:", error);
        return MOCK_LEARN_RESOURCES;
    }
}

const getLearnResourcesCached = unstable_cache(
    fetchLearnResourcesRaw,
    ['learn-resources'],
    { tags: ['learn'], revalidate: 60 }
);

export async function getLearnResources(): Promise<LearnResource[]> {
    return process.env.NODE_ENV === 'development'
        ? fetchLearnResourcesRaw()
        : getLearnResourcesCached();
}

function mapRecordToBlogPost(record: any): BlogPost {
    // Helper to safely extract attachment URLs array
    const contentImages = (record.get('ContentImages') as any[])?.map((img: any) => img.url) || [];

    let excerpt = record.get('Excerpt') as string;
    const content = record.get('Content') as string || "";

    // Auto-generate excerpt if missing
    if (!excerpt && content) {
        // Simple markdown stripper and truncate
        let plainText = content
            .replace(/^#+\s+/gm, '') // Remove headers
            .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
            .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italics
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
            .replace(/`{3}[\s\S]*?`{3}/g, '') // Remove code blocks
            .replace(/`(.+?)`/g, '$1') // Remove inline code
            .replace(/{{image:\d+}}/g, '') // Remove our custom image tags
            .replace(/{{video(?::[^}]+)?}}/g, '') // Remove custom video tags
            .replace(/\s+/g, ' ')
            .trim();

        if (plainText.length > 160) {
            const cut = plainText.substring(0, 160);
            const lastSpace = cut.lastIndexOf(' ');
            excerpt = (lastSpace > 100 ? cut.substring(0, lastSpace) : cut).trim() + "...";
        } else {
            excerpt = plainText;
        }
    }

    let readTime = record.get('ReadTime') as string;
    // Auto-calculate read time if missing
    if (!readTime && content) {
        const wordsPerMinute = 200;
        const wordCount = content.trim().split(/\s+/).length;
        // Ensure at least 1 min read
        const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
        readTime = `${minutes} min read`;
    }

    // Debugging Image Field
    const rawImage = record.get('Image');

    // Fallback logic: Use explicit 'Image' field first, otherwise first 'ContentImages'
    let mainImageUrl = (rawImage as any)?.[0]?.url;
    if (!mainImageUrl && contentImages.length > 0) {
        mainImageUrl = contentImages[0];
    }

    // Video URL processing
    const videoUrl = record.get('VideoURL') as string;

    return {
        id: record.id,
        title: record.get('Title') as string,
        excerpt: excerpt,
        author: record.get('Author') as string,
        date: record.get('Date') as string,
        category: record.get('Category') as string,
        slug: record.get('Slug') as string || record.id,
        content: content,
        imageUrl: mainImageUrl, // Use the resolved URL
        videoUrl: videoUrl,
        readTime: readTime,
        contentImages,
        likes: Math.max(0, Number(record.get('Likes') || 0)),
    };
}

export async function getPostComments(slug: string): Promise<BlogComment[]> {
    if (!base) return [];

    try {
        const tableId = commentsTableId || 'Comments';
        const decodedSlug = decodeURIComponent(slug);
        const escapedSlug = decodedSlug.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        const records = await base(tableId).select({
            filterByFormula: `{PostSlug} = '${escapedSlug}'`,
        }).all();

        return records
            .filter(record => {
                const status = (record.get('Status') as string | undefined)?.trim().toLowerCase();
                return !status || status === 'approved';
            })
            .map(record => ({
                id: record.id,
                author: String(record.get('Author') || 'Anonymous'),
                body: String(record.get('Body') || ''),
                postSlug: String(record.get('PostSlug') || decodedSlug),
                postTitle: record.get('PostTitle') ? String(record.get('PostTitle')) : undefined,
                createdAt: (record as unknown as { _rawJson?: { createdTime?: string } })._rawJson?.createdTime || new Date().toISOString(),
            }))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
        console.error("Error fetching blog comments from Airtable:", error);
        return [];
    }
}

export async function createPostComment(data: {
    postSlug: string;
    postTitle?: string;
    author: string;
    body: string;
}): Promise<{ success: true; comment: BlogComment } | { success: false; error: string }> {
    if (!base) {
        return { success: false, error: "Database connection failed" };
    }

    try {
        const tableId = commentsTableId || 'Comments';
        const created = await base(tableId).create([
            {
                fields: {
                    Author: data.author.trim(),
                    Body: data.body.trim(),
                    PostSlug: decodeURIComponent(data.postSlug),
                    ...(data.postTitle ? { PostTitle: data.postTitle } : {}),
                    Status: 'Approved',
                }
            }
        ], { typecast: true });

        const record = created[0];
        return {
            success: true,
            comment: {
                id: record.id,
                author: String(record.get('Author') || data.author.trim()),
                body: String(record.get('Body') || data.body.trim()),
                postSlug: String(record.get('PostSlug') || data.postSlug),
                postTitle: record.get('PostTitle') ? String(record.get('PostTitle')) : data.postTitle,
                createdAt: (record as unknown as { _rawJson?: { createdTime?: string } })._rawJson?.createdTime || new Date().toISOString(),
            },
        };
    } catch (error: unknown) {
        console.error("Error creating comment in Airtable:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to save comment.",
        };
    }
}

export async function getPostLikes(slug: string): Promise<number | null> {
    if (!base || !blogTableId) return null;
    try {
        const decodedSlug = decodeURIComponent(slug);
        const escapedSlug = decodedSlug.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const records = await base(blogTableId).select({
            filterByFormula: `{Slug} = '${escapedSlug}'`,
            maxRecords: 1,
        }).firstPage();
        if (records.length === 0) return null;
        return Math.max(0, Number(records[0].get('Likes') || 0));
    } catch (error) {
        console.error("Error fetching likes from Airtable:", error);
        return null;
    }
}

export async function updatePostLikes(
    slug: string,
    delta: 1 | -1
): Promise<{ success: true; likes: number } | { success: false; error: string }> {
    if (!base || !blogTableId) {
        return { success: false, error: "Database connection failed" };
    }

    try {
        const decodedSlug = decodeURIComponent(slug);
        const escapedSlug = decodedSlug.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const records = await base(blogTableId).select({
            filterByFormula: `{Slug} = '${escapedSlug}'`,
            maxRecords: 1,
        }).firstPage();

        if (records.length === 0) {
            return { success: false, error: "Article not found" };
        }

        const record = records[0];
        const current = Math.max(0, Number(record.get('Likes') || 0));
        const next = Math.max(0, current + delta);

        await base(blogTableId).update([
            {
                id: record.id,
                fields: { Likes: next },
            }
        ]);

        return { success: true, likes: next };
    } catch (error: unknown) {
        console.error("Error updating likes in Airtable:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to update likes.",
        };
    }
}

export async function submitIdea(data: {
    title: string;
    problem: string;
    solution: string;
    resources: string;
    category: string;
}) {
    if (!base) {
        console.error("Airtable not initialized");
        return { success: false, error: "Database connection failed" };
    }

    try {
        const tableId = ideasTableId || 'Ideas';

        await base(tableId).create([
            {
                fields: {
                    Title: data.title,
                    Problem: data.problem,
                    Solution: data.solution,
                    Resources: data.resources,
                    Category: data.category,
                    Status: 'New'
                }
            }
        ], { typecast: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting idea to Airtable:", error);
        return { success: false, error: error.message || JSON.stringify(error) };
    }
}
