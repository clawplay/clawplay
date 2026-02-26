import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from './types';

// Standard API response helpers
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  error: string,
  status = 400,
  hint?: string
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error, hint }, { status });
}

// Rate limiting helper (in-memory for now, should use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Periodically clean up expired entries to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupRateLimitMap();
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Get client IP from request
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}

// Extract bearer token from Authorization header
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

// CORS headers for API routes
export function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Handle OPTIONS preflight requests
export function handleOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// Standard 429 response with rate-limit headers
export function rateLimitResponse(
  resetAt: number,
  remaining: number
): NextResponse<ApiResponse> {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { success: false, error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(retryAfter, 1)),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}
