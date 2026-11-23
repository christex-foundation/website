import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

const ALLOWED_TAGS = ['blog', 'events', 'learn', 'gallery'] as const;
type AllowedTag = (typeof ALLOWED_TAGS)[number];

function verifySecret(provided: string | null, expected: string): boolean {
    if (!provided) return false;
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);
    if (providedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

function getProvidedSecret(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }
    return (
        request.headers.get('x-revalidate-secret') ||
        request.nextUrl.searchParams.get('secret')
    );
}

function parseTags(raw: unknown): AllowedTag[] {
    if (!raw || raw === 'all') {
        return [...ALLOWED_TAGS];
    }

    const list = Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
            ? raw.split(',').map(s => s.trim())
            : [];

    const valid = list.filter((t): t is AllowedTag =>
        ALLOWED_TAGS.includes(t as AllowedTag)
    );

    return valid.length > 0 ? valid : [...ALLOWED_TAGS];
}

export async function POST(request: NextRequest) {
    const expectedSecret = process.env.REVALIDATE_SECRET;

    if (!expectedSecret) {
        return NextResponse.json(
            { error: 'REVALIDATE_SECRET is not configured on the server.' },
            { status: 500 }
        );
    }

    const providedSecret = getProvidedSecret(request);
    if (!verifySecret(providedSecret, expectedSecret)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let bodyTag: unknown;
    try {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const body = await request.json();
            bodyTag = body?.tags ?? body?.tag;
        }
    } catch {
        // Ignore empty or malformed JSON bodies and fall back to query params / all tags
    }

    const queryTag = request.nextUrl.searchParams.get('tags') || request.nextUrl.searchParams.get('tag');
    const tags = parseTags(bodyTag ?? queryTag);

    for (const tag of tags) {
        revalidateTag(tag, { expire: 0 });
    }

    if (tags.includes('blog')) {
        revalidatePath('/blog');
        revalidatePath('/blog/[slug]', 'page');
        revalidatePath('/api/latest-update');
    }
    if (tags.includes('events')) {
        revalidatePath('/events');
        revalidatePath('/api/latest-update');
    }
    if (tags.includes('learn')) {
        revalidatePath('/');
    }

    return NextResponse.json({
        revalidated: true,
        tags,
        timestamp: new Date().toISOString(),
    });
}
