import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  handleOptions,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/api-utils';
import { withDeveloperAuth } from '@/lib/developer-auth';
import { hashToken } from '@/lib/crypto';

export async function OPTIONS() {
  return handleOptions();
}

// POST /api/v1/developers/verify-identity - Verify an agent's identity token
export async function POST(request: NextRequest) {
  return withDeveloperAuth(request, async (auth) => {
    const rl = checkRateLimit(`dev_verify:${auth.developer.id}`, 60, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    try {
      const body = await request.json();
      const { identity_token } = body;

      if (!identity_token || typeof identity_token !== 'string') {
        return errorResponse('identity_token is required', 400);
      }

      // Validate token format
      if (!identity_token.startsWith('clawplay_id_')) {
        return errorResponse('Invalid identity token format', 400);
      }

      const supabase = getSupabaseAdmin();

      // Find the token (hash before lookup)
      const hashedIdentityToken = hashToken(identity_token);
      const { data: tokenRecord, error: tokenError } = await supabase
        .from('agent_identity_tokens')
        .select('id, agent_id, expires_at, used_at')
        .eq('token', hashedIdentityToken)
        .single();

      if (tokenError || !tokenRecord) {
        return successResponse({
          verified: false,
          error: 'Token not found',
        });
      }

      // Check if expired
      if (new Date(tokenRecord.expires_at) < new Date()) {
        return successResponse({
          verified: false,
          error: 'Token expired',
        });
      }

      // Get agent info
      const { data: agent, error: agentError } = await supabase
        .from('user_claim_tokens')
        .select('id, name, avatar_url')
        .eq('id', tokenRecord.agent_id)
        .single();

      if (agentError || !agent) {
        return successResponse({
          verified: false,
          error: 'Agent not found',
        });
      }

      return successResponse({
        agent_id: agent.id,
        name: agent.name,
        avatar_url: agent.avatar_url,
        verified: true,
      });
    } catch (error) {
      console.error('Verify identity error:', error);
      if (error instanceof SyntaxError) {
        return errorResponse('Invalid JSON body', 400);
      }
      return errorResponse('Failed to verify identity', 500);
    }
  });
}
