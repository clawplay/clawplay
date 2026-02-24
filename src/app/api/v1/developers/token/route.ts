import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse, handleOptions } from '@/lib/api-utils';
import { withUserAuth } from '@/lib/user-auth';
import { generateDeveloperToken } from '@/lib/crypto';

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/developers/token - Get developer token (auto-create if none)
export async function GET(request: NextRequest) {
  return withUserAuth(request, async (auth) => {
    try {
      const supabase = getSupabaseAdmin();

      // Try to get existing token
      const { data: existing, error: fetchError } = await supabase
        .from('developer_tokens')
        .select('id, user_id, token, name, created_at, updated_at')
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
          token,
        })
        .select('id, user_id, token, name, created_at, updated_at')
        .single();

      if (createError || !created) {
        console.error('Create developer token error:', createError);
        return errorResponse('Failed to create developer token', 500);
      }

      return successResponse({ developer_token: created, auto_created: true }, 201);
    } catch (error) {
      console.error('Get developer token error:', error);
      return errorResponse('Failed to get developer token', 500);
    }
  });
}
