import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse, handleOptions } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth';
import { generateIdentityToken } from '@/lib/crypto';

const IDENTITY_TOKEN_TTL_SECONDS = 300; // 5 minutes

export async function OPTIONS() {
  return handleOptions();
}

// POST /api/v1/agents/me/identity-token - Generate a short-lived identity token
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const supabase = getSupabaseAdmin();

      // Generate new identity token
      const token = generateIdentityToken();
      const expiresAt = new Date(Date.now() + IDENTITY_TOKEN_TTL_SECONDS * 1000);

      // Store the token
      const { error: insertError } = await supabase.from('agent_identity_tokens').insert({
        agent_id: auth.agent.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) {
        console.error('Create identity token error:', insertError);
        return errorResponse('Failed to create identity token', 500);
      }

      return successResponse({
        identity_token: token,
        expires_at: expiresAt.toISOString(),
        expires_in: IDENTITY_TOKEN_TTL_SECONDS,
      });
    } catch (error) {
      console.error('Create identity token error:', error);
      return errorResponse('Failed to create identity token', 500);
    }
  });
}
