import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
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

// GET /api/v1/credits/balance - Agent queries owner's credit balance
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    const rl = checkRateLimit(`agent:${auth.agent.id}`, 100, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    if (!auth.agent.user_id) {
      return errorResponse('Agent has no owner', 403);
    }

    const credits = await getUserCreditBalance(auth.agent.user_id);
    if (!credits) {
      return errorResponse('Failed to fetch credit balance', 500);
    }

    return successResponse(credits);
  });
}
