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

// GET /api/v1/developers/apps - List developer's apps
export async function GET(request: NextRequest) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    try {
      const supabase = getSupabaseAdmin();

      // First get the developer token
      const { data: devToken, error: tokenError } = await supabase
        .from('developer_tokens')
        .select('id')
        .eq('user_id', auth.user.id)
        .single();

      if (tokenError && tokenError.code !== 'PGRST116') {
        console.error('Fetch developer token error:', tokenError);
        return errorResponse('Failed to fetch developer token', 500);
      }

      if (!devToken) {
        // No developer token yet, return empty list
        return successResponse({ apps: [] });
      }

      // Get all apps for this developer
      const { data: apps, error: appsError } = await supabase
        .from('developer_apps')
        .select('*')
        .eq('developer_id', devToken.id)
        .order('created_at', { ascending: false });

      if (appsError) {
        console.error('Fetch developer apps error:', appsError);
        return errorResponse('Failed to fetch apps', 500);
      }

      return successResponse({ apps: apps || [] });
    } catch (error) {
      console.error('List developer apps error:', error);
      return errorResponse('Failed to list apps', 500);
    }
  });
}

// POST /api/v1/developers/apps - Create a new app
export async function POST(request: NextRequest) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    try {
      const body = await request.json();
      const { name, slug, skill_url, description, icon_url, category } = body;

      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return errorResponse('Name is required', 400);
      }

      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        return errorResponse('Slug is required', 400);
      }

      if (!skill_url || typeof skill_url !== 'string' || skill_url.trim().length === 0) {
        return errorResponse('Skill URL is required', 400);
      }

      // Validate slug format
      const slugPattern = /^[a-z0-9-]+$/;
      if (!slugPattern.test(slug)) {
        return errorResponse('Slug must contain only lowercase letters, numbers, and hyphens', 400);
      }

      if (slug.length > 50) {
        return errorResponse('Slug must be at most 50 characters', 400);
      }

      if (name.length > 100) {
        return errorResponse('Name must be at most 100 characters', 400);
      }

      // Validate skill_url is a valid URL
      try {
        new URL(skill_url);
      } catch {
        return errorResponse('Skill URL must be a valid URL', 400);
      }

      // Validate category if provided
      const validCategories = ['social', 'tool', 'game', 'other'];
      if (category && !validCategories.includes(category)) {
        return errorResponse(`Category must be one of: ${validCategories.join(', ')}`, 400);
      }

      const supabase = getSupabaseAdmin();

      // Get or create developer token
      const result = await supabase
        .from('developer_tokens')
        .select('id')
        .eq('user_id', auth.user.id)
        .single();

      let devToken = result.data;
      const tokenError = result.error;

      if (tokenError && tokenError.code !== 'PGRST116') {
        console.error('Fetch developer token error:', tokenError);
        return errorResponse('Failed to fetch developer token', 500);
      }

      if (!devToken) {
        // Auto-create developer token
        const { generateDeveloperToken, hashToken, getTokenPrefix } = await import('@/lib/crypto');
        const token = generateDeveloperToken();
        const { data: created, error: createError } = await supabase
          .from('developer_tokens')
          .insert({
            user_id: auth.user.id,
            token: hashToken(token),
            token_prefix: getTokenPrefix(token),
          })
          .select('id')
          .single();

        if (createError || !created) {
          console.error('Create developer token error:', createError);
          return errorResponse('Failed to create developer token', 500);
        }
        devToken = created;
      }

      // Check if slug already exists
      const { data: existingApp } = await supabase
        .from('developer_apps')
        .select('id')
        .eq('slug', slug.toLowerCase())
        .single();

      if (existingApp) {
        return errorResponse('An app with this slug already exists', 409);
      }

      // Also check against main apps table
      const { data: existingMainApp } = await supabase
        .from('apps')
        .select('id')
        .eq('slug', slug.toLowerCase())
        .single();

      if (existingMainApp) {
        return errorResponse('This slug is reserved', 409);
      }

      // Create the app
      const { data: app, error: createError } = await supabase
        .from('developer_apps')
        .insert({
          developer_id: devToken.id,
          slug: slug.toLowerCase(),
          name: name.trim(),
          description: description?.trim() || null,
          icon_url: icon_url?.trim() || null,
          skill_url: skill_url.trim(),
          category: category || 'other',
        })
        .select('*')
        .single();

      if (createError || !app) {
        console.error('Create app error:', createError);
        return errorResponse('Failed to create app', 500);
      }

      return successResponse({ app }, 201);
    } catch (error) {
      console.error('Create app error:', error);
      if (error instanceof SyntaxError) {
        return errorResponse('Invalid JSON body', 400);
      }
      return errorResponse('Failed to create app', 500);
    }
  });
}
