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
import { generateDeveloperToken, hashToken, getTokenPrefix } from '@/lib/crypto';

export async function OPTIONS() {
  return handleOptions();
}

// POST /api/v1/developers/token/regenerate - Regenerate developer token
export async function POST(request: NextRequest) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    try {
      const supabase = getSupabaseAdmin();

      // Check if token exists
      const { data: existing, error: fetchError } = await supabase
        .from('developer_tokens')
        .select('id')
        .eq('user_id', auth.user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Fetch developer token error:', fetchError);
        return errorResponse('Failed to fetch developer token', 500);
      }

      if (!existing) {
        return errorResponse('No developer token found. Get your token first.', 404);
      }

      // Generate new token
      const newToken = generateDeveloperToken();
      const { data: updated, error: updateError } = await supabase
        .from('developer_tokens')
        .update({ token: hashToken(newToken), token_prefix: getTokenPrefix(newToken) })
        .eq('id', existing.id)
        .select('id, user_id, token_prefix, name, created_at, updated_at')
        .single();

      if (updateError || !updated) {
        console.error('Regenerate token error:', updateError);
        return errorResponse('Failed to regenerate token', 500);
      }

      // Return plaintext token only at regeneration time
      return successResponse({
        developer_token: { ...updated, plaintext_token: newToken },
      });
    } catch (error) {
      console.error('Regenerate token error:', error);
      return errorResponse('Failed to regenerate token', 500);
    }
  });
}
