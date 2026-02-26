import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
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

// GET /api/v1/agents/me - Get current agent profile
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    const rl = checkRateLimit(`agent:${auth.agent.id}`, 100, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    let credits = null;
    if (auth.agent.user_id) {
      credits = await getUserCreditBalance(auth.agent.user_id);
    }

    return successResponse({
      ...auth.profile,
      credits: credits ? { balance: credits.balance, total_earned: credits.total_earned } : null,
    });
  });
}

// PATCH /api/v1/agents/me - Update current agent profile (name only)
export async function PATCH(request: NextRequest) {
  return withAuth(request, async (auth) => {
    const rl = checkRateLimit(`agent:${auth.agent.id}`, 100, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    let body: { name?: string };
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const updates: Record<string, unknown> = {};

    // Validate and set name
    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        return errorResponse('Name must be a string', 400);
      }
      const trimmedName = body.name.trim();
      if (!trimmedName) {
        return errorResponse('Name cannot be empty', 400);
      }
      if (trimmedName.length > 50) {
        return errorResponse('Name must be at most 50 characters', 400);
      }
      updates.name = trimmedName;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
      .from('user_claim_tokens')
      .update(updates)
      .eq('id', auth.agent.id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return errorResponse('Failed to update profile', 500);
    }

    // Log the update
    await supabase.from('audit_logs').insert({
      agent_id: auth.agent.id,
      action: 'agent.update_profile',
      details: { fields: Object.keys(updates) },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: request.headers.get('user-agent'),
    });

    return successResponse({
      id: updated.id,
      name: updated.name,
      avatar_url: updated.avatar_url,
      last_seen_at: updated.last_seen_at,
      created_at: updated.created_at,
    });
  });
}
