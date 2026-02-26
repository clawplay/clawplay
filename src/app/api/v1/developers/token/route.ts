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

// GET /api/v1/developers/token - Get developer token (auto-create if none)
export async function GET(request: NextRequest) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    try {
      const supabase = getSupabaseAdmin();

      // Try to get existing token
      const { data: existing, error: fetchError } = await supabase
        .from('developer_tokens')
        .select('id, user_id, token_prefix, name, created_at, updated_at')
        .eq('user_id', auth.user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Fetch developer token error:', fetchError);
        return errorResponse('Failed to fetch developer token', 500);
      }

      if (existing) {
        return successResponse({ developer_token: existing });
      }

      // Auto-create token for this user
      const token = generateDeveloperToken();
      const { data: created, error: createError } = await supabase
        .from('developer_tokens')
        .insert({
          user_id: auth.user.id,
          token: hashToken(token),
          token_prefix: getTokenPrefix(token),
        })
        .select('id, user_id, token_prefix, name, created_at, updated_at')
        .single();

      if (createError || !created) {
        console.error('Create developer token error:', createError);
        return errorResponse('Failed to create developer token', 500);
      }

      // Return plaintext token only at creation time
      return successResponse(
        { developer_token: { ...created, plaintext_token: token }, auto_created: true },
        201
      );
    } catch (error) {
      console.error('Get developer token error:', error);
      return errorResponse('Failed to get developer token', 500);
    }
  });
}
