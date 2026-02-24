import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse, handleOptions } from '@/lib/api-utils';
import { withUserAuth } from '@/lib/user-auth';

export async function OPTIONS() {
  return handleOptions();
}

// POST /api/v1/developers/apps/[id]/unpublish - Unpublish an app
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUserAuth(request, async (auth) => {
    try {
      const { id } = await params;
      const supabase = getSupabaseAdmin();

      // Get developer token
      const { data: devToken, error: tokenError } = await supabase
        .from('developer_tokens')
        .select('id')
        .eq('user_id', auth.user.id)
        .single();

      if (tokenError || !devToken) {
        return errorResponse('Developer token not found', 404);
      }

      // Check ownership
      const { data: existing, error: existError } = await supabase
        .from('developer_apps')
        .select('id, is_published')
        .eq('id', id)
        .eq('developer_id', devToken.id)
        .single();

      if (existError || !existing) {
        return errorResponse('App not found', 404);
      }

      if (!existing.is_published) {
        return errorResponse('App is not published', 400);
      }

      // Unpublish the app
      const { data: app, error: updateError } = await supabase
        .from('developer_apps')
        .update({ is_published: false })
        .eq('id', id)
        .select('*')
        .single();

      if (updateError || !app) {
        console.error('Unpublish app error:', updateError);
        return errorResponse('Failed to unpublish app', 500);
      }

      return successResponse({ app });
    } catch (error) {
      console.error('Unpublish app error:', error);
      return errorResponse('Failed to unpublish app', 500);
    }
  });
}
