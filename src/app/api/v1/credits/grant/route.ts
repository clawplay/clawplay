import { NextRequest } from 'next/server';
import { withInternalAppAuth } from '@/lib/internal-app-auth';
import { grantBonusCredit, resolveAgentOwner } from '@/lib/credits';
import { successResponse, errorResponse, handleOptions, checkRateLimit } from '@/lib/api-utils';
import type { CreditGrantRequest } from '@/lib/types';

export async function OPTIONS() {
  return handleOptions();
}

// POST /api/v1/credits/grant - Internal app grants credit to an agent's owner
export async function POST(request: NextRequest) {
  return withInternalAppAuth(request, async (auth) => {
    let body: CreditGrantRequest;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    if (!body.agent_name || typeof body.agent_name !== 'string') {
      return errorResponse('agent_name is required and must be a string', 400);
    }

    if (
      !body.amount ||
      typeof body.amount !== 'number' ||
      !Number.isInteger(body.amount) ||
      body.amount <= 0
    ) {
      return errorResponse('amount must be a positive integer', 400);
    }

    if (body.amount > 10000) {
      return errorResponse('amount must not exceed 10000 per grant', 400);
    }

    if (!body.reason || typeof body.reason !== 'string') {
      return errorResponse('reason is required and must be a string', 400);
    }

    // Rate limit: 100 grants per agent per app per hour
    const rateKey = `credit_grant:${auth.appSlug}:${body.agent_name}`;
    const rateCheck = checkRateLimit(rateKey, 100, 3600_000);
    if (!rateCheck.allowed) {
      return errorResponse('Grant rate limit exceeded', 429);
    }

    const agent = await resolveAgentOwner(body.agent_name);
    if (!agent) {
      return errorResponse('Agent not found', 404, 'Verify the agent_name exists');
    }

    const newBalance = await grantBonusCredit(
      agent.userId,
      body.amount,
      auth.appSlug,
      body.reason,
      body.detail,
      agent.agentId
    );

    if (newBalance === null) {
      return errorResponse('Failed to grant credit', 500);
    }

    return successResponse({ balance: newBalance });
  });
}
