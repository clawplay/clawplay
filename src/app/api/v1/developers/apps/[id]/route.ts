import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse, handleOptions } from '@/lib/api-utils';
import { withUserAuth } from '@/lib/user-auth';

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/developers/apps/[id] - Get app details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

      // Get the app
      const { data: app, error: appError } = await supabase
        .from('developer_apps')
        .select('*')
        .eq('id', id)
        .eq('developer_id', devToken.id)
        .single();

      if (appError || !app) {
        return errorResponse('App not found', 404);
      }

      return successResponse({ app });
    } catch (error) {
      console.error('Get app error:', error);
      return errorResponse('Failed to get app', 500);
    }
  });
}

// PATCH /api/v1/developers/apps/[id] - Update app
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUserAuth(request, async (auth) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { name, description, icon_url, skill_url, category } = body;

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
        .select('id')
        .eq('id', id)
        .eq('developer_id', devToken.id)
        .single();

      if (existError || !existing) {
        return errorResponse('App not found', 404);
      }

      // Build update object
      const updates: Record<string, unknown> = {};

      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          return errorResponse('Name cannot be empty', 400);
        }
        if (name.length > 100) {
          return errorResponse('Name must be at most 100 characters', 400);
        }
        updates.name = name.trim();
      }

      if (description !== undefined) {
        updates.description = description?.trim() || null;
      }

      if (icon_url !== undefined) {
        updates.icon_url = icon_url?.trim() || null;
      }

      if (skill_url !== undefined) {
        if (typeof skill_url !== 'string' || skill_url.trim().length === 0) {
          return errorResponse('Skill URL cannot be empty', 400);
        }
        try {
          new URL(skill_url);
        } catch {
          return errorResponse('Skill URL must be a valid URL', 400);
        }
        updates.skill_url = skill_url.trim();
      }

      if (category !== undefined) {
        const validCategories = ['social', 'tool', 'game', 'other'];
        if (!validCategories.includes(category)) {
          return errorResponse(`Category must be one of: ${validCategories.join(', ')}`, 400);
        }
        updates.category = category;
      }

      if (Object.keys(updates).length === 0) {
        return errorResponse('No valid fields to update', 400);
      }

      // Update the app
      const { data: app, error: updateError } = await supabase
        .from('developer_apps')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (updateError || !app) {
        console.error('Update app error:', updateError);
        return errorResponse('Failed to update app', 500);
      }

      return successResponse({ app });
    } catch (error) {
      console.error('Update app error:', error);
      if (error instanceof SyntaxError) {
        return errorResponse('Invalid JSON body', 400);
      }
      return errorResponse('Failed to update app', 500);
    }
  });
}

// DELETE /api/v1/developers/apps/[id] - Delete app
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

      // Check ownership and delete
      const { error: deleteError } = await supabase
        .from('developer_apps')
        .delete()
        .eq('id', id)
        .eq('developer_id', devToken.id);

      if (deleteError) {
        console.error('Delete app error:', deleteError);
        return errorResponse('Failed to delete app', 500);
      }

      return successResponse({ deleted: true });
    } catch (error) {
      console.error('Delete app error:', error);
      return errorResponse('Failed to delete app', 500);
    }
  });
}
