import { NextResponse } from 'next/server';
import { getBlogPosts, getEvents } from '@/lib/airtable';

export async function GET() {
    try {
        const [posts, events] = await Promise.all([
            getBlogPosts(),
            getEvents()
        ]);

        // Normalize Data
        const normalizedPosts = posts.map(p => ({
            type: 'blog',
            title: p.title,
            description: p.excerpt,
            category: p.category,
            link: `/blog/${p.slug}`,
            date: p.date,
            sortDate: new Date(p.date).getTime(),
            imageUrl: p.imageUrl // Pass image URL
        }));

        const normalizedEvents = events.map(e => ({
            type: 'event',
            title: e.title,
            description: e.description,
            category: "Event",
            link: e.registrationLink || "/events",
            date: e.date,
            sortDate: new Date(e.date).getTime(),
            imageUrl: e.imageUrl // Pass image URL
        }));

        let featuredItem = null;

        // 1. Latest Post (Already sorted DESC in lib)
        const latestPost = normalizedPosts[0];

        // 2. Next Upcoming Event (Already sorted ASC (future) in lib)
        const nextEvent = normalizedEvents[0];

        // Default to latest post
        featuredItem = latestPost;

        // If there is an event, and it's happening within 14 days, prioritize it
        if (nextEvent) {
            const now = new Date().getTime();
            const eventTime = nextEvent.sortDate;
            const twoWeeks = 14 * 24 * 60 * 60 * 1000;

            if (!featuredItem) {
                featuredItem = nextEvent;
            } else if (eventTime > now && eventTime - now < twoWeeks) {
                featuredItem = nextEvent;
            }
        }

        if (featuredItem) {
            return NextResponse.json(featuredItem);
        }

        // Final Fallback
        return NextResponse.json({
            title: "Community Updates",
            description: "Stay tuned for the latest news and events.",
            category: "Update",
            link: "/blog",
            date: new Date().toISOString().split('T')[0],
            imageUrl: null
        });

    } catch (error) {
        console.error("Error in /api/latest-update:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
