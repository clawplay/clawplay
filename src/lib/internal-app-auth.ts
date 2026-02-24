import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { errorResponse } from './api-utils';

const APP_SECRETS: Record<string, string | undefined> = {
  xtrade: process.env.XTRADE_SECRET,
  avalon: process.env.AVALON_SECRET,
};

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export interface InternalAppAuthResult {
  appSlug: string;
}

export function authenticateInternalApp(request: NextRequest): InternalAppAuthResult | null {
  const secret = request.headers.get('X-App-Secret');
  if (!secret) return null;

  for (const [slug, expected] of Object.entries(APP_SECRETS)) {
    if (expected && safeCompare(secret, expected)) {
      return { appSlug: slug };
    }
  }

  return null;
}

export async function withInternalAppAuth(
  request: NextRequest,
  handler: (auth: InternalAppAuthResult) => Promise<Response>
): Promise<Response> {
  const auth = authenticateInternalApp(request);

  if (!auth) {
    return errorResponse(
      'Invalid or missing app secret',
      401,
      'Include X-App-Secret header with a valid internal app secret'
    );
  }

  return handler(auth);
}
