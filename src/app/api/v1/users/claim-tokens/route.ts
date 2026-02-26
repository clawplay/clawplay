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
import { generateAgentToken, generateAgentName, hashToken, getTokenPrefix } from '@/lib/crypto';

const MAX_AGENTS_PER_USER = 5;

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/users/claim-tokens - List current user's agents (auto-create if none)
export async function GET(request: NextRequest) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('user_claim_tokens')
        .select(
          'id, token_prefix, name, avatar_url, last_seen_at, last_access_app, created_at, updated_at'
        )
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch agents error:', error);
        return errorResponse('Failed to fetch agents', 500);
      }

      let tokens: (Record<string, unknown>)[] = data || [];
      let autoCreated = false;

      if (tokens.length === 0) {
        const token = generateAgentToken();
        const name = generateAgentName();
        const { data: created, error: createError } = await supabase
          .from('user_claim_tokens')
          .insert({
            user_id: auth.user.id,
            token: hashToken(token),
            token_prefix: getTokenPrefix(token),
            name,
          })
          .select(
            'id, token_prefix, name, avatar_url, last_seen_at, last_access_app, created_at, updated_at'
          )
          .single();

        if (createError || !created) {
          console.error('Auto-create agent error:', createError);
          return errorResponse('Failed to create agent', 500);
        }

        // Return plaintext token only at creation time
        tokens = [{ ...created, plaintext_token: token }];
        autoCreated = true;
      }

      return successResponse({ tokens, auto_created: autoCreated });
    } catch (error) {
      console.error('Fetch agents error:', error);
      return errorResponse('Failed to fetch agents', 500);
    }
  });
}

// POST /api/v1/users/claim-tokens - Create a new agent
export async function POST(request: NextRequest) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    try {
      const supabase = getSupabaseAdmin();

      // Check agent limit
      const { count, error: countError } = await supabase
        .from('user_claim_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auth.user.id);

      if (countError) {
        console.error('Count agents error:', countError);
        return errorResponse('Failed to check agent limit', 500);
      }

      if ((count ?? 0) >= MAX_AGENTS_PER_USER) {
        return errorResponse(`Maximum ${MAX_AGENTS_PER_USER} agents per user allowed`, 400);
      }

      const token = generateAgentToken();
      const name = generateAgentName();

      const { data, error } = await supabase
        .from('user_claim_tokens')
        .insert({
          user_id: auth.user.id,
          token: hashToken(token),
          token_prefix: getTokenPrefix(token),
          name,
        })
        .select(
          'id, token_prefix, name, avatar_url, last_seen_at, last_access_app, created_at, updated_at'
        )
        .single();

      if (error || !data) {
        console.error('Create agent error:', error);
        return errorResponse('Failed to create agent', 500);
      }

      // Return plaintext token only at creation time
      return successResponse({ token: { ...data, plaintext_token: token } }, 201);
    } catch (error) {
      console.error('Create agent error:', error);
      return errorResponse('Failed to create agent', 500);
    }
  });
}
