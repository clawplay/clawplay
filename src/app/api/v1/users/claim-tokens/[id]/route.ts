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

export async function OPTIONS() {
  return handleOptions();
}

// PATCH /api/v1/users/claim-tokens/[id] - Update token name
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    const { id } = await params;
    let body: { name?: string };

    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    if (typeof body.name !== 'string' || !body.name.trim()) {
      return errorResponse('name is required and must be a non-empty string', 400);
    }

    const trimmedName = body.name.trim();
    if (trimmedName.length > 50) {
      return errorResponse('name must be at most 50 characters', 400);
    }

    const supabase = getSupabaseAdmin();
    const { data: token, error: findError } = await supabase
      .from('user_claim_tokens')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single();

    if (findError || !token) {
      return errorResponse('Claim token not found', 404);
    }

    const { data: updated, error: updateError } = await supabase
      .from('user_claim_tokens')
      .update({ name: trimmedName })
      .eq('id', id)
      .select('id, token_prefix, name, last_access_app, last_seen_at, created_at, updated_at')
      .single();

    if (updateError || !updated) {
      console.error('Update claim token error:', updateError);
      return errorResponse('Failed to agent info', 500);
    }

    return successResponse({ token: updated });
  });
}

// DELETE /api/v1/users/claim-tokens/[id] - Delete a claim token
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: token, error: findError } = await supabase
      .from('user_claim_tokens')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single();

    if (findError || !token) {
      return errorResponse('Claim token not found', 404);
    }

    const { error: deleteError } = await supabase.from('user_claim_tokens').delete().eq('id', id);

    if (deleteError) {
      console.error('Delete claim token error:', deleteError);
      return errorResponse('Failed to delete claim token', 500);
    }

    return successResponse({ message: 'Claim token deleted' });
  });
}
