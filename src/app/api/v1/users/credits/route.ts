import { NextRequest } from 'next/server';
import { withUserAuth } from '@/lib/user-auth';
import { getUserCreditBalance } from '@/lib/credits';
import {
  successResponse,
  errorResponse,
  handleOptions,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/api-utils';

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/users/credits - User views own credit balance
export async function GET(request: NextRequest) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    const credits = await getUserCreditBalance(auth.user.id);
    if (!credits) {
      return errorResponse('Failed to fetch credit balance', 500);
    }

    return successResponse(credits);
  });
}
