import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  handleOptions,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/api-utils';
import { withUserAuth } from '@/lib/user-auth';
import { generateAgentToken, hashToken, getTokenPrefix } from '@/lib/crypto';

export async function OPTIONS() {
  return handleOptions();
}

// POST /api/v1/users/claim-tokens/[id]/regenerate - Regenerate agent token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('user_claim_tokens')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single();

    if (findError || !existing) {
      return errorResponse('Agent not found', 404);
    }

    // Generate new token
    const newToken = generateAgentToken();
    const { data: updated, error: updateError } = await supabase
      .from('user_claim_tokens')
      .update({
        token: hashToken(newToken),
        token_prefix: getTokenPrefix(newToken),
      })
      .eq('id', id)
      .select(
        'id, token_prefix, name, avatar_url, last_seen_at, last_access_app, created_at, updated_at'
      )
      .single();

    if (updateError || !updated) {
      console.error('Regenerate agent token error:', updateError);
      return errorResponse('Failed to regenerate token', 500);
    }

    // Return plaintext token only at regeneration time
    return successResponse({ token: { ...updated, plaintext_token: newToken } });
  });
}
