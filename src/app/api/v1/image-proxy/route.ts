import { NextRequest, NextResponse } from 'next/server';

const cache = new Map<string, { data: ArrayBuffer; contentType: string; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100;

function cleanupCache() {
  const now = Date.now();
  const keysToDelete: string[] = [];

  cache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_TTL_MS) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => cache.delete(key));

  // LRU-like cleanup if cache too large
  if (cache.size > MAX_CACHE_SIZE) {
    const entries: Array<[string, { timestamp: number }]> = [];
    cache.forEach((value, key) => entries.push([key, { timestamp: value.timestamp }]));
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const deleteCount = cache.size - MAX_CACHE_SIZE;
    for (let i = 0; i < deleteCount; i++) {
      cache.delete(entries[i][0]);
    }
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Check cache
  const cacheKey = url;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return new NextResponse(cached.data, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'HIT',
      },
    });
  }

  // Fetch image
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'image/*',
        'User-Agent': 'ClawPlay-ImageProxy/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('Content-Type') || 'image/png';

    // Verify it's an image
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 });
    }

    const data = await response.arrayBuffer();

    // Store in cache
    cache.set(cacheKey, { data, contentType, timestamp: Date.now() });
    cleanupCache();

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
